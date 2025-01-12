import { RequestHandler } from "express";
import InviteService from "../services/InviteService";
import { InviteError } from "../errors/InviteError";
import UserService from "../services/UserService";
import { auth0 } from "../config/auth0";

export class InviteController {
    static createInvites: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const { invites } = req.body;
            const auth0Id = req.auth?.payload.sub;

            if (!auth0Id) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const user = await UserService.getUserByAuth0Id(auth0Id);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const createdInvites = [];
            for (const invite of invites) {
                try {
                    const createdInvite = await InviteService.createInvite(
                        invite.workspaceId,
                        user._id.toString(),
                        invite.invitedEmail
                    );
                    createdInvites.push(createdInvite);
                } catch (error) {
                    console.error(`Failed to create invite for ${invite.invitedEmail}:`, error);
                }
            }

            res.json({ invites: createdInvites });
        } catch (error) {
            next(error);
        }
    }

    static validateInvite: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const token = req.params.inviteId;
            console.log('Validating invite with token:', token);
            const invite = await InviteService.verifyInviteToken(token);
            res.json(invite);
        } catch (error) {
            if (error instanceof InviteError) {
                res.status(error.statusCode).json({ 
                    error: error.message,
                    code: error.code 
                });
                return;
            }
            next(error);
        }
    }

    static acceptInvite: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const { inviteToken, userId } = req.body;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            let user = await UserService.getUserByAuth0Id(userId);
            if (!user) {
                // Get Auth0 user profile
                const auth0User = await auth0.users.get({ id: userId });
                
                // Create new user
                user = await UserService.createUser({
                    auth0Id: userId,
                    email: auth0User.data.email || '',
                    displayName: auth0User.data.name || auth0User.data.nickname || '',
                    avatarUrl: auth0User.data.picture || '',
                    isVerified: auth0User.data.email_verified || false,
                    status: 'active'
                });
            }

            await InviteService.acceptInvite(inviteToken, user._id.toString());
            res.json({ message: 'Invite accepted successfully' });
        } catch (error) {
            if (error instanceof InviteError) {
                res.status(error.statusCode).json({ 
                    error: error.message,
                    code: error.code 
                });
                return;
            }
            next(error);
        }
    }

    static getWorkspaceInvites: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const { workspaceId } = req.params;
            const invites = await InviteService.getWorkspaceInvites(workspaceId);
            res.json(invites);
        } catch (error) {
            next(error);
        }
    }

    static getInvite: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const { token } = req.params;
            const invite = await InviteService.getInvite(token);
            
            if (!invite) {
                res.status(404).json({ error: 'Invite not found' });
                return;
            }

            res.json(invite);
        } catch (error) {
            next(error);
        }
    }
}

export default InviteController;