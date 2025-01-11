// src/controllers/userController.ts
import { ManagementClient } from 'auth0';
import { Request, RequestHandler, Response } from 'express';
import User from '../models/User';
import UserService from '../services/UserService';
import WorkspaceService from '../services/WorkspaceService';
import InviteService from '../services/InviteService';

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN || '',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
});

export class UserController {
  static createUser: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { auth0Id, email, displayName, avatarUrl } = req.body;

      // Validate required fields
      if (!auth0Id || !email) {
        res.status(400).json({ error: 'auth0Id and email are required' });
        return;
      }

      const user = await UserService.createUser({
        auth0Id,
        email,
        displayName,
        avatarUrl,
        isVerified: true,
        status: 'active'
      });

      res.status(201).json(user);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 11000) { // MongoDB duplicate key error
        res.status(409).json({ error: 'User already exists' });
        return;
      }
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static getUser: RequestHandler = async (req, res, next) => {
    try {
      const auth0Id = req.auth?.payload.sub;
      if (!auth0Id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get Auth0 user profile
      const auth0User = await auth0.users.get({ id: auth0Id });
      
      let user = await User.findOne({ auth0Id });
      let workspace;
      
      if (!user) {
        user = await UserService.createUser({
          auth0Id,
          email: auth0User.data.email || '',
          displayName: auth0User.data.name || auth0User.data.nickname || '',
          avatarUrl: auth0User.data.picture || '',
          isVerified: auth0User.data.email_verified || false,
          status: 'active'
        });
        workspace = await WorkspaceService.createWorkspace({
          name: `${user.displayName}'s Workspace`,
          ownerId: user._id,
          members: [{ userId: user._id, role: 'admin' }]
        });
      } else {
        workspace = await WorkspaceService.getWorkspacesByUserId(user._id.toString());
      }

      const invites = await InviteService.getInvitesForUser(user._id.toString());
      res.json({
        user,
        auth0User: auth0User.data,
        workspace,
        invites
      });
    } catch (error) {
      next(error);
    }
  }

  static updateUser: RequestHandler = async (req, res, next) => {
    try {
      const auth0Id = req.auth?.payload.sub;
      const { displayName, avatarUrl } = req.body;

      const user = await User.findOneAndUpdate(
        { auth0Id },
        { 
          $set: { 
            ...(displayName && { displayName }),
            ...(avatarUrl && { avatarUrl })
          }
        },
        { new: true }
      );

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json(user);
      return;
    } catch (error) {
      next(error);
    }
  }
}
