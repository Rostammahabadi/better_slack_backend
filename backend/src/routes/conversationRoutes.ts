// src/routes/messageRoutes.ts
import { Router } from 'express';
import { ConversationController } from '../controllers/ConversationController';
import { checkJwt } from '../middleware/auth';

const router = Router();

router.use(checkJwt);

router.get('/', ConversationController.getConversations);
router.post('/', ConversationController.createConversation);
router.get('/:id', ConversationController.getConversationWithMessages);
router.get('/:conversationId/messages', ConversationController.getMessages);
router.post('/:conversationId/messages', ConversationController.sendMessage);
router.post('/:conversationId/messages/:messageId/replies', ConversationController.replyToMessage);

export default router;
