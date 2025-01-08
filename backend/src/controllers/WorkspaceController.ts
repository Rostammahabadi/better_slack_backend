import { RequestHandler } from 'express';
import WorkspaceService from '../services/WorkspaceService';
import UserService from '../services/UserService';

export class WorkspaceController {
    static getWorkspace: RequestHandler = async (req, res, next): Promise<void> => {
        const { workspaceId } = req.params;
        const workspace = await WorkspaceService.getWorkspaceById(workspaceId);
        res.json(workspace);
    }

    static getWorkspaceChannels: RequestHandler = async (req, res, next): Promise<void> => {
        const { workspaceId } = req.params;
        const channels = await WorkspaceService.getWorkspaceChannels(workspaceId);
        res.json(channels);
    }

    static inviteUsersToWorkspace: RequestHandler = async (req, res, next): Promise<void> => {
        const { workspaceId } = req.params;
        const { emails } = req.body;
        const userId = await UserService.getUserByAuth0Id(req.auth?.payload.sub as string);
        if (!userId) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const invites = await WorkspaceService.inviteUsersToWorkspace(workspaceId, userId._id.toString(), emails);
        res.status(201).json(invites);
    }
}