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
      // Check for existing user
      const existingUser = await User.findOne({
        $or: [{ auth0Id: userData.auth0Id }, { email: userData.email }]
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Generate base username from email
      let baseUsername = userData.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      // Handle username uniqueness
      let username = baseUsername;
      let counter = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Create new user
      const user = new User({
        auth0Id: userData.auth0Id,
        email: userData.email,
        username,
        displayName: userData.displayName || username,
        avatarUrl: userData.avatarUrl
      });

      await user.save();

      // Create default workspace
      const workspaceName = `${userData.displayName || user.username}'s Workspace`;
      const workspace = await WorkspaceService.createWorkspace({
        name: workspaceName,
        ownerId: user._id as Types.ObjectId
      });

      return { user, workspace };
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        throw new Error('User already exists');
      }
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
