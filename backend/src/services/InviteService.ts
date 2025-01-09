// src/services/ChannelService.ts
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
    await sgMail.send(msg).then(() => {
        console.log('Email sent');
        return invite;
    }).catch((error) => {
      console.error('Error sending email', error);
    });
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
