import { RequestHandler } from "express";
import MessageService from "../services/MessageService";
import ReactionService from "../services/ReactionService";
import UserService from "../services/UserService";

export class MessageController {
    static createMessage: RequestHandler = async (req, res, next): Promise<void> => {
        const { channelId } = req.params;
        const message = await MessageService.createMessage(channelId, req.body);
        res.json(message);
    }

    static createMessageReaction: RequestHandler = async (req, res, next): Promise<void> => {
        try {
            const { messageId } = req.params;
            const emoji = req.body.emoji || req.body;
            const user = await UserService.getUserByAuth0Id(req.auth?.payload.sub as string);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            const reaction = await ReactionService.addReaction(messageId, user._id.toString(), emoji);
            res.json(reaction);
        } catch (error) {
            next(error);
        }
    }
}