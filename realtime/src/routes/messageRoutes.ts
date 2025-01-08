// src/routes/messageRoutes.ts
import { Router } from 'express';
import { MessageController } from '../controllers/MessageController';
const router = Router();

// Add your message routes here
// router.post('/', messageController.createMessage);
// router.get('/:channelId', messageController.getMessages);
router.put('/:messageId', MessageController.updateMessage);

export default router;
