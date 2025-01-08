// src/controllers/ReactionController.ts
import { RequestHandler } from 'express';
import ReactionService from '../services/ReactionService';
import UserService from '../services/UserService';

export class ReactionController {
  static addReaction: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const auth0Id = req.auth?.payload.sub;

      if (!emoji) {
        res.status(400).json({ error: 'Emoji is required' });
        return;
      }

      const user = await UserService.getUserByAuth0Id(auth0Id as string);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const reaction = await ReactionService.addReaction(
        messageId,
        user._id.toString(),
        emoji
      );

      res.status(201).json(reaction);
    } catch (error: any) {
      if (error.message === 'Reaction already exists') {
        res.status(409).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  static removeReaction: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const { messageId, reactionId } = req.params;
      const auth0Id = req.auth?.payload.sub;

      const user = await UserService.getUserByAuth0Id(auth0Id as string);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const removed = await ReactionService.removeReaction(
        messageId,
        user._id.toString(),
        reactionId
      );

      if (!removed) {
        res.status(404).json({ error: 'Reaction not found' });
        return;
      }

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  };
}

export default ReactionController;
