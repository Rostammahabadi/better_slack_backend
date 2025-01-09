// src/services/ChannelService.ts
import fetch from 'node-fetch';
global.fetch = fetch as any;

import Invite, { IInviteDocument } from '../models/Invite';
import sgMail from '@sendgrid/mail';
import UserService from './UserService';
import { ManagementClient } from 'auth0';
import * as crypto from 'crypto';

export interface IInvite {
  workspaceId: string;
  channelId: string;
  createdBy: string;
  expiresAt: Date;
}

class InviteService {
  private management: ManagementClient;

  constructor() {
    this.management = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN || '',
      clientId: process.env.AUTH0_CLIENT_ID || '',
      clientSecret: process.env.AUTH0_CLIENT_SECRET || ''
    });
  }

  async createInvite(inviteData: typeof Invite): Promise<any> {
    sgMail.setApiKey(process.env.SENDGRID_KEY || '');
    const invite = new Invite(inviteData);
    await invite.save();
    const user = await UserService.getUserByAuth0Id(invite.invitedBy.toString());
    const msg = {
      to: invite.invitedEmail,
      from: 'RostamMahabadi@gmail.com',
      subject: 'You have been invited to join a workspace on ChatGenius',
      templateId: 'd-c4a4e072297241008159d89c320f7e49',
      dynamicTemplateData: {
        buttonUrl: `http://localhost:5173/invite/${invite.token}`,
        inviterName: user?.displayName,
        inviteeName: invite.invitedEmail.split('@')[0],
        unsubscribe: '#',
        unsubscribe_preferences: '#',
      }
    };
    try {
      await sgMail.send(msg).then(() => {
        console.log('Email sent');
        this.createUserAndInvite(invite);
      });
      return invite;
    } catch (error) {
      console.error('Error sending email', error);
      throw error;
    }
  }

  async createUserAndInvite(invite: IInviteDocument): Promise<string> {
    try {
      const user = await UserService.createUser({
        email: invite.invitedEmail,
        auth0Id: "0",
        isVerified: false,
        displayName: invite.invitedEmail.split('@')[0],
        avatarUrl: '',
        status: 'inactive'
      });
      const invitationurl = await this.management.users.create({
        email: invite.invitedEmail,
        connection: 'Username-Password-Authentication',
        email_verified: false,
        password: crypto.randomBytes(32).toString('hex'),
        user_metadata: {
          workspaceId: invite.workspaceId,
          inviteId: invite._id
        }
      });
      console.log(invitationurl);
      const ticket = await this.management.tickets.changePassword({
        user_id: user.user.id,
        result_url: process.env.AUTH0_CALLBACK_URL,
        connection_id: 'Username-Password-Authentication',
        email: invite.invitedEmail,
        organization_id: invite.workspaceId.toString(),
        mark_email_as_verified: true
      });
      
      return ticket.data.ticket;
    } catch (error) {
      console.error('Error creating invitation:', error);
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
