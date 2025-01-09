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
}