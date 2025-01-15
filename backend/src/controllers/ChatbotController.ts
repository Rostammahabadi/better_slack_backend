import { RequestHandler } from 'express';
import ChatbotService from '../services/ChatbotService';
import UserService from '../services/UserService';

export class ChatbotController {
  static getConversation: RequestHandler = async (req, res, next) => {
    try {
      const auth0Id = req.auth?.payload.sub;
      const workspaceId = req.params.workspaceId;
      if (!auth0Id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await UserService.getUserByAuth0Id(auth0Id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const conversation = await ChatbotService.getOrCreateBotConversation(user, workspaceId);
      res.json(conversation);
    } catch (error) {
      next(error);
    }
  };

  static saveMessage: RequestHandler = async (req, res, next) => {
    try {
      const savedMessage = await ChatbotService.saveBotMessage(req.body);
      res.json(savedMessage);
    } catch (error) {
      next(error);
    }
  };
} 