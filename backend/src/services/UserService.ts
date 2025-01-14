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
  accountStatus: 'active' | 'inactive';
}

interface SetStatusDto {
  emoji?: string;
  text: string;
  expiresAt?: Date;
}

class UserService {
  async createUser(userData: CreateUserDto): Promise<IUser> {
    try {
      // Check for existing user with more detailed error handling
      const existingUser = await User.findOne({
        $or: [{ auth0Id: userData.auth0Id }, { email: userData.email }]
      });

      if (existingUser) {
        // Get the first workspace or create one if none exists
        const workspaces = await WorkspaceService.getWorkspacesByUserId(existingUser._id.toString());
        const workspace = workspaces[0]; // Get first workspace
        
        if (!workspace) {
          // Create a workspace if user doesn't have one
          const workspaceName = `${existingUser.displayName || existingUser.username}'s Workspace`;
          const newWorkspace = await WorkspaceService.createWorkspace({
            name: workspaceName,
            ownerId: existingUser._id,
            members: [{ userId: existingUser._id, role: 'admin' }]
          });
          
          // Only push if workspace ID isn't already in the array
          if (!existingUser.workspaces.includes(newWorkspace._id)) {
            existingUser.workspaces.push(newWorkspace._id);
            await existingUser.save();
          }
        } else if (!existingUser.workspaces.includes(workspace._id)) {
          // Only push if workspace ID isn't already in the array
          existingUser.workspaces.push(workspace._id);
          await existingUser.save();
        }
        
        return existingUser;
      }

      // Create new user
      const user = new User({
        auth0Id: userData.auth0Id,
        email: userData.email.toLowerCase(), // Ensure email is lowercase
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        accountStatus: 'active',
        isVerified: true,
        username: userData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
        workspaces: [] // Initialize empty workspaces array
      });

      await user.save();

      // Create default workspace
      try {
        const workspaceName = `${userData.displayName || user.username}'s Workspace`;
        const workspace = await WorkspaceService.createWorkspace({
          name: workspaceName,
          ownerId: user._id,
          members: [{ userId: user._id, role: 'admin' }]
        });

        // Add workspace to user's workspaces array
        user.workspaces.push(workspace._id);
        await user.save();
        
        return user;
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

  async getUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
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

  async setStatus(userId: string, statusData: SetStatusDto): Promise<IUser> {
    const userStatus = {
      ...statusData,
      createdAt: new Date()
    };

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { userStatus } },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async clearStatus(userId: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { $unset: { userStatus: "" } },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async getUsers(
    limit: number = 10,
    lastId?: string,
    search?: string,
    workspaceId?: string
  ): Promise<IUser[]> {
    const query: any = {};
    
    // Add _id condition for pagination
    if (lastId) {
      query._id = { $lt: new Types.ObjectId(lastId) };
    }

    // Add search condition if provided
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (workspaceId) {
      query.workspaces = { $in: [new Types.ObjectId(workspaceId)] };
    }

    return User.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .select('displayName username avatarUrl email userStatus');
  }
}

export default new UserService();
