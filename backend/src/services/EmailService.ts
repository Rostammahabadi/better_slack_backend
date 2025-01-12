import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { IInvite } from '../models/Invite';

class EmailService {
  constructor() {
    if (process.env.SENDGRID_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_KEY);
    }
  }

  async sendInviteEmail(invite: IInvite, inviterName: string): Promise<void> {
    try {
      if (!process.env.SENDGRID_KEY) {
        console.log('Skipping email send - SENDGRID_KEY not configured');
        return;
      }

      const msg: MailDataRequired = {
        to: invite.invitedEmail,
        from: 'RostamMahabadi@gmail.com',
        subject: 'Workspace Invitation',
        templateId: process.env.SENDGRID_INVITE_TEMPLATE_ID,
        text: `You have been invited to join a workspace by ${inviterName}`,
        html: `<p>You have been invited to join a workspace by ${inviterName}</p>
              <p>Click <a href="${process.env.FRONTEND_URL}/invites/${invite.token}">here</a> to accept the invitation.</p>`,
        dynamicTemplateData: {
          inviterName,
          inviteeName: invite.invitedEmail.split('@')[0],
          buttonUrl: `${process.env.FRONTEND_URL}/invites/${invite.token}`,
          expiresAt: invite.expiresAt.toLocaleDateString()
        }
      };

      await sgMail.send(msg);
      console.log(`Invite email sent to ${invite.invitedEmail}`);
    } catch (error) {
      console.error('SendGrid error:', error);
    }
  }
}

export default new EmailService(); 