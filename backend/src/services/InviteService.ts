// src/services/ChannelService.ts
import fetch from 'node-fetch';
import FormData from 'form-data';
import { Blob } from 'buffer';

global.fetch = fetch as any;
global.FormData = FormData as any;
global.Blob = Blob as any;

import { Types } from 'mongoose';
import Invite, { IInvite } from '../models/Invite';
import { InviteError } from '../errors/InviteError';
import EmailService from './EmailService';
import UserService from './UserService';
import WorkspaceService from './WorkspaceService';

class InviteService {
  async createInvite(workspaceId: string, invitedBy: string, invitedEmail: string): Promise<IInvite> {
    try {
      // Check if user has access to workspace
      const workspace = await WorkspaceService.getWorkspaceById(workspaceId);
      if (!workspace) {
        throw InviteError.noWorkspaceAccess();
      }

      // Check if invite already exists
      const existingInvite = await Invite.findOne({
        workspaceId,
        invitedEmail,
        status: 'pending'
      });

      if (existingInvite) {
        return existingInvite;
      }

      const invite = new Invite({
        workspaceId: new Types.ObjectId(workspaceId),
        invitedBy: new Types.ObjectId(invitedBy),
        invitedEmail: invitedEmail.toLowerCase(),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      console.log('Creating invite with token:', invite.token);
      await invite.save();
      console.log('Saved invite:', invite);

      // Send invite email
      const inviter = await UserService.getUserById(invitedBy);
      if (inviter) {
        await EmailService.sendInviteEmail(invite, inviter.displayName || '');
      }

      return invite;
    } catch (error) {
      console.error('Error creating invite:', error);
      throw error;
    }
  }

  async verifyInviteToken(token: string): Promise<IInvite> {
    console.log('Verifying token:', token);
    const invite = await Invite.findOne({ token }).populate('workspaceId');
    console.log('Found invite:', invite);
    
    if (!invite) {
      throw InviteError.invalidToken();
    }

    if (invite.status !== 'pending') {
      throw InviteError.alreadyAccepted();
    }

    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      throw InviteError.expired();
    }

    return invite;
  }

  async acceptInvite(token: string, userId: string): Promise<void> {
    const invite = await this.verifyInviteToken(token);

    try {
      // Get the workspaceId string safely
      const workspaceId = typeof invite.workspaceId === 'string' 
        ? invite.workspaceId 
        : invite.workspaceId._id.toString();

      // Add user to workspace
      await WorkspaceService.addMemberToWorkspace(
        workspaceId,
        userId,
        'member'
      );

      // Update invite status
      invite.status = 'accepted';
      await invite.save();
    } catch (error) {
      console.error('Error accepting invite:', error);
      throw error;
    }
  }

  async getWorkspaceInvites(workspaceId: string): Promise<IInvite[]> {
    return Invite.find({
      workspaceId: new Types.ObjectId(workspaceId),
      status: 'pending'
    }).populate('invitedBy', 'displayName email');
  }

  async getInvite(token: string): Promise<IInvite | null> {
    return Invite.findOne({ token })
      .populate('workspaceId')
      .populate('invitedBy', 'displayName email');
  }

  async getInvitesForUser(userId: string): Promise<IInvite[]> {
    return Invite.find({ 
      invitedBy: new Types.ObjectId(userId),
      status: 'pending'
    }).populate('workspaceId');
  }
}

export default new InviteService();
