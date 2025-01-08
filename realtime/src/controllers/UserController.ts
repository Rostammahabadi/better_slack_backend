// src/controllers/userController.ts
import { Request, RequestHandler, Response } from 'express';
import User from '../models/User';
import UserService from '../services/UserService';
import WorkspaceService from '../services/WorkspaceService';

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
        avatarUrl
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
      const user = await User.findOne({ auth0Id });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Get associated workspace
      const workspace = await WorkspaceService.getWorkspacesByUserId(user._id.toString());

      res.json({
        user,
        workspace
      });
      return;
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
