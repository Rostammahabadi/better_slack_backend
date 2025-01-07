// src/controllers/ChannelController.ts
import { Request, RequestHandler, Response } from 'express';
import ChannelService from '../services/ChannelService';
import UserService from '../services/UserService';
import { Types } from 'mongoose';
import WorkspaceService from '../services/WorkspaceService';
import MessageService from "../services/MessageService";

export class ChannelController {
    static createChannel: RequestHandler = async (req, res, next): Promise<void> => {
        console.log('CreateChannel method called');
        console.log('Request params:', req.params);
        console.log('Request body:', req.body);
        try {
            const { name, type, description } = req.body;
            const { workspaceId } = req.params;
            const auth0Id = req.auth?.payload.sub;
        
            if (!name) {
              res.status(400).json({ error: 'Channel name is required' });
              return;
            }
        
            // Validate channel name format
            const nameRegex = /^[a-z0-9-_]+$/;
            if (!nameRegex.test(name)) {
              res.status(400).json({ 
                error: 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores' 
              });
              return;
            }
        
            const user = await UserService.getUserByAuth0Id(auth0Id as string);
            if (!user) {
              res.status(404).json({ error: 'User not found' });
              return;
            }
        
            // Verify user has access to workspace
            const workspace = await WorkspaceService.getWorkspaceById(workspaceId);
            if (!workspace) {
              res.status(404).json({ error: 'Workspace not found' });
              return;
            }
            // Check if user is a member of the workspace
            const isMember = workspace.members.some(
              member => member.userId._id.toString() === user._id.toString()
            );
            
            if (!isMember) {
              res.status(403).json({ error: 'User is not a member of this workspace' });
              return;
            }
        
            const channel = await ChannelService.createChannel({
              name,
              workspaceId: new Types.ObjectId(workspaceId),
              type: type || 'public',
              description,
              createdBy: new Types.ObjectId(user._id.toString())
            });
        
            res.status(201).json(channel);
          } catch (error) {
            next(error);
          }
      };

      static getChannelMessages: RequestHandler = async (req, res, next): Promise<void> => {
        try {
          const { channelId } = req.params;
          const messages = await MessageService.getInstance().getMessagesByChannelId(channelId);
          res.json(messages);
        } catch (error) {
          next(error);
        }
      };


//   static updateChannel = async (req: Request, res: Response) => {
//     try {
//       const { channelId } = req.params;
//       const { name, description } = req.body;

//       const channel = await ChannelService.updateChannel(channelId, {
//         ...(name && { name }),
//         ...(description && { description })
//       });

//       if (!channel) {
//         return res.status(404).json({ error: 'Channel not found' });
//       }

//       res.json(channel);
//     } catch (error) {
//       console.error('Error updating channel:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   };

//   static convertChannelType = async (req: Request, res: Response) => {
//     try {
//       const { channelId } = req.params;
//       const { type } = req.body;

//       if (!['public', 'private'].includes(type)) {
//         return res.status(400).json({ error: 'Invalid channel type' });
//       }

//       const channel = await ChannelService.convertChannelType(channelId, type);
//       res.json(channel);
//     } catch (error) {
//       console.error('Error converting channel type:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   };

//   static archiveChannel = async (req: Request, res: Response) => {
//     try {
//       const { channelId } = req.params;
//       await ChannelService.archiveChannel(channelId);
//       res.status(204).send();
//     } catch (error) {
//       console.error('Error archiving channel:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   };
}

export default ChannelController;
