// src/services/UserService.ts
import { Types } from 'mongoose';
import User, { IUser } from '../models/User';
import WorkspaceService from './WorkspaceService';
import { IWorkspace } from '../models/Workspace';

interface CreateUserDto {
  auth0Id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified: boolean;
  status: 'active' | 'inactive';
}

interface UserWithWorkspace {
  user: IUser;
  workspace: IWorkspace;
}

class UserService {
  async createUser(userData: CreateUserDto): Promise<UserWithWorkspace> {
    try {
      // Check for existing user with more detailed error handling
      const existingUser = await User.findOne({
        $or: [{ auth0Id: userData.auth0Id }, { email: userData.email }]
      });

      if (existingUser) {
        // Fix: Get the first workspace or create one if none exists
        const workspaces = await WorkspaceService.getWorkspacesByUserId(existingUser._id.toString());
        const workspace = workspaces[0]; // Get first workspace
        if (!workspace) {
          // Create a workspace if user doesn't have one
          const workspaceName = `${existingUser.displayName || existingUser.username}'s Workspace`;
          const newWorkspace = await WorkspaceService.createWorkspace({
            name: workspaceName,
            ownerId: existingUser._id
          });
          return { user: existingUser, workspace: newWorkspace };
        }
        return { user: existingUser, workspace };
      }

      // Create new user with proper error handling
      const user = new User({
        auth0Id: userData.auth0Id,
        email: userData.email.toLowerCase(), // Ensure email is lowercase
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        status: 'active',
        isVerified: true,
        username: userData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
      });

      await user.save();

      // Create default workspace with error handling
      try {
        const workspaceName = `${userData.displayName || user.username}'s Workspace`;
        const workspace = await WorkspaceService.createWorkspace({
          name: workspaceName,
          ownerId: user._id
        });

        return { user, workspace };
      } catch (workspaceError) {
        // If workspace creation fails, delete the user and throw
        await User.findByIdAndDelete(user._id);
        throw workspaceError;
      }
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async getUserByAuth0Id(auth0Id: string): Promise<IUser | null> {
    return User.findOne({ auth0Id });
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(userId);
    return !!result;
  }

  async searchUsers(query: string): Promise<IUser[]> {
    return User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);
  }
}

export default new UserService();
