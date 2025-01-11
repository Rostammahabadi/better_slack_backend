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

    static createWorkspace: RequestHandler = async (req, res, next): Promise<void> => {
        const user = await UserService.getUserByAuth0Id(req.auth?.payload.sub as string);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const { name } = req.body;
        const workspace = await WorkspaceService.createWorkspace({ name, ownerId: user._id, members: [{ userId: user._id, role: 'admin' }] });
        res.json(workspace);
    }

    static getWorkspacesForUser: RequestHandler = async (req, res, next): Promise<void> => {
        const user = await UserService.getUserByAuth0Id(req.auth?.payload.sub as string);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const workspaces = await WorkspaceService.getWorkspacesForUser(user._id.toString());
        res.json(workspaces);
    }
}