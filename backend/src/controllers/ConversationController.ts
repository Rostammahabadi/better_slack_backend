import { Request, RequestHandler, Response } from 'express';
import ConversationService from '../services/ConversationService';
import UserService from '../services/UserService';
export class ConversationController {
    static getConversations: RequestHandler = async (req, res, next): Promise<void> => {
        const user = await UserService.getUserByAuth0Id(req.auth?.payload.sub as string);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const conversations = await ConversationService.getRecentConversations(user._id.toString());
        res.status(200).json(conversations);
    }

    static createConversation: RequestHandler = async (req, res, next) => {
        try {
            const { participants, message } = req.body;
            const auth0Id = req.auth?.payload.sub;

            if (!auth0Id || !participants || !message) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Get MongoDB user from Auth0 ID
            const user = await UserService.getUserByAuth0Id(auth0Id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const conversation = await ConversationService.createGroupConversation(
                participants,
                message,
                user._id.toString()
            );

            res.status(201).json(conversation);
        } catch (error) {
            next(error);
        }
    };

    static getConversationWithMessages: RequestHandler = async (req, res, next) => {
        const { id } = req.params;

        const conversation = await ConversationService.getConversationWithMessages(id);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        res.json(conversation);
    };

    static getMessages: RequestHandler = async (req, res, next) => {
        try {
            const { conversationId } = req.params;
            const limit = parseInt(req.query.limit as string) || 50;
            const before = req.query.before as string;

            const messages = await ConversationService.getConversationMessages(
                conversationId,
                limit,
                before
            );

            res.json({
                messages,
                nextCursor: messages.length === limit ? messages[messages.length - 1]._id : null
            });
        } catch (error) {
            next(error);
        }
    };

    static sendMessage: RequestHandler = async (req, res, next) => {
        try {
            const { conversationId } = req.params;
            const { content } = req.body;
            const auth0Id = req.auth?.payload.sub;

            if (!auth0Id || !content) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const user = await UserService.getUserByAuth0Id(auth0Id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const message = await ConversationService.createMessage(
                conversationId,
                user._id.toString(),
                content
            );

            res.status(201).json(message);
        } catch (error) {
            next(error);
        }
    };

    static replyToMessage: RequestHandler = async (req, res, next) => {
        try {
            const { conversationId, messageId } = req.params;
            const { content } = req.body;
            const auth0Id = req.auth?.payload.sub;

            if (!auth0Id || !content) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const user = await UserService.getUserByAuth0Id(auth0Id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const reply = await ConversationService.createThreadReply(
                conversationId,
                messageId,
                user._id.toString(),
                content
            );

            res.status(201).json(reply);
        } catch (error) {
            next(error);
        }
    };

    static updateMessage: RequestHandler = async (req, res, next) => {
        try {
            const { conversationId, messageId } = req.params;
            const { content } = req.body;
            const auth0Id = req.auth?.payload.sub;

            if (!auth0Id || !content) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const user = await UserService.getUserByAuth0Id(auth0Id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const message = await ConversationService.updateMessage(
                messageId,
                user._id.toString(),
                content
            );

            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }

            res.json(message);
        } catch (error) {
            next(error);
        }
    };

}
