// src/routes/channelRoutes.ts
import express from 'express';
import ChannelController from '../controllers/ChannelController';
import { MessageController } from '../controllers/MessageController';
const router = express.Router();

router.post('/:workspaceId/channels', ChannelController.createChannel);
router.get('/:channelId/messages', ChannelController.getMessages);
router.post('/:channelId/messages', MessageController.createMessage);
router.post('/:channelId/messages/:messageId/replies', ChannelController.replyToMessage);

export default router;
