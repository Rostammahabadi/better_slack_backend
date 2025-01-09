import { RequestHandler } from "express";
import InviteService from "../services/InviteService";
import UserService from "../services/UserService";
export class InviteController {
    static createInvites: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const invites = req.body.emails;
            const createdInvites = [];

            for (const inviteData of invites) {
                const invite = await InviteService.createInvite(inviteData);
                createdInvites.push(invite);
            }

            res.json({invites: createdInvites});
        } catch (error) {
            next(error);
        }
    }

    static getInvite: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const { inviteId } = req.params;
            const invite = await InviteService.getInvite(inviteId);
            res.json(invite);
        } catch (error) {
            next(error);
        }
    }

    static getInvites: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const user = await UserService.getUserByAuth0Id(req.auth?.payload.sub as string);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            const invites = await InviteService.getInvitesForUser(user._id.toString());
            res.json(invites);
        } catch (error) {
            next(error);
        }
    }

    static deleteInvite: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const { inviteId } = req.params;
            const invite = await InviteService.deleteInvite(inviteId);
            res.json(invite);
        } catch (error) {
            next(error);
        }
    }

    static updateInvite: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const { inviteId } = req.params;
            const invite = await InviteService.updateInvite(inviteId, req.body);
            res.json(invite);
        } catch (error) {
            next(error);
        }
    }
}

export default InviteController;