// src/routes/channelRoutes.ts
import express from 'express';
import { checkJwt, debugAuth } from '../middleware/auth';
import ChannelController from '../controllers/ChannelController';
import { MessageController } from '../controllers/MessageController';
const router = express.Router();
router.use(debugAuth); // Optional: for debugging
router.use(checkJwt);  // Auth0 JWT verification

router.post('/:workspaceId/channels', ChannelController.createChannel);
router.get('/:channelId/messages', ChannelController.getChannelMessages);
router.post('/:channelId/messages', MessageController.createMessage);
// router.put('/:channelId', checkJwt, ChannelController.updateChannel);
// router.post('/:channelId/members', checkJwt, ChannelController.addMember);
// router.delete('/:channelId/members/:userId', checkJwt, ChannelController.removeMember);
// router.put('/:channelId/convert', checkJwt, ChannelController.convertChannelType);
// router.delete('/:channelId', checkJwt, ChannelController.archiveChannel);

export default router;
