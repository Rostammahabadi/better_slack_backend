import { Request, Response, NextFunction } from 'express';
import { AuthResult } from 'express-oauth2-jwt-bearer';
import WorkspaceService from '../services/WorkspaceService';
import UserService from '../services/UserService';
import { IUser } from '../models/User';
import { IWorkspace } from '../models/Workspace';

interface AuthenticatedRequest extends Request {
  auth?: AuthResult;
  user?: IUser;
  workspace?: IWorkspace;
}

export const checkWorkspaceAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const workspaceId = authReq.params.workspaceId || 
      (authReq.body.invites && authReq.body.invites[0]?.workspaceId);

    if (!workspaceId) {
      res.status(400).json({ error: 'Workspace ID is required' });
      return;
    }

    const auth0Id = authReq.auth?.payload.sub;

    if (!auth0Id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await UserService.getUserByAuth0Id(auth0Id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const workspace = await WorkspaceService.getWorkspaceById(workspaceId);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }
    console.log(workspace.members)
    console.log(user._id.toString())
    const isMember = workspace.members.some(
      member => member.userId._id.toString() === user._id.toString()
    ) || workspace.ownerId.toString() === user._id.toString();

    if (!isMember) {
      res.status(403).json({ error: 'No access to workspace' });
      return;
    }

    authReq.user = user;
    authReq.workspace = workspace;
    next();
  } catch (error) {
    next(error);
  }
}; 