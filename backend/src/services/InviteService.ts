// src/services/ChannelService.ts
import fetch from 'node-fetch';
import FormData from 'form-data';
import { Blob } from 'buffer';

global.fetch = fetch as any;
global.FormData = FormData as any;
global.Blob = Blob as any;

import Invite from '../models/Invite';
import sgMail from '@sendgrid/mail';
import UserService from './UserService';

export interface IInvite {
  workspaceId: string;
  channelId: string;
  createdBy: string;
  expiresAt: Date;
}

class InviteService {

  async createInvite(inviteData: typeof Invite): Promise<any> {
    try {
      // 1. Create the invite record first
      const invite = new Invite(inviteData);
      await invite.save();

      const foundUser = await UserService.getUserByEmail(invite.invitedEmail);
      let user;
      if (!foundUser) {
        // 3. Create local user linked to Auth0
        user = await UserService.createUser({
          email: invite.invitedEmail,
          isVerified: false,
          displayName: invite.invitedEmail.split('@')[0],
          avatarUrl: '',
          status: 'inactive',
          auth0Id: ''
        });
      } else {
        foundUser.workspaces.push(invite.workspaceId);
        await foundUser.save();
      }

      sgMail.setApiKey(process.env.SENDGRID_KEY || '');
      const msg = {
        to: invite.invitedEmail,
        from: 'RostamMahabadi@gmail.com',
        subject: foundUser ? 'You have been invited to join a workspace on ChatGenius' : 'You have been invited to join a workspace on ChatGenius',
        templateId: 'd-c4a4e072297241008159d89c320f7e49',
        dynamicTemplateData: {
          buttonUrl: `${process.env.FRONTEND_URL}/invites/${invite.token}`,
          inviterName: (await UserService.getUserByAuth0Id(invite.invitedBy.toString()))?.displayName,
          unsubscribe: '#',
          unsubscribe_preferences: '#',
        }
      };

      const response = await sgMail.send(msg);
      console.log(response);
      return invite;
      
    } catch (error) {
      console.error('Error in invite creation process:', error);
      throw error;
    }
  }

  async getInvite(inviteId: string): Promise<any> {
    return await Invite.findById(inviteId);
  }

  async deleteInvite(inviteId: string): Promise<void> {
    await Invite.findByIdAndDelete(inviteId);
  }

  async updateInvite(inviteId: string, inviteData: IInvite): Promise<any> {
    return await Invite.findByIdAndUpdate(inviteId, inviteData, { new: true });
  }

  async getInvitesForUser(userId: string): Promise<any> {
    return await Invite.find({ invitedBy: userId });
  }
}

export default new InviteService();
