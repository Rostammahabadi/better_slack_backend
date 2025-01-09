// src/routes/channelRoutes.ts
import express from 'express';
import ChannelController from '../controllers/ChannelController';
import { MessageController } from '../controllers/MessageController';
const router = express.Router();

router.post('/:workspaceId/channels', ChannelController.createChannel);
router.get('/:channelId/messages', ChannelController.getChannelMessages);
router.post('/:channelId/messages', MessageController.createMessage);

export default router;
