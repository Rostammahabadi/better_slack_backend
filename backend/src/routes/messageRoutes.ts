// src/routes/messageRoutes.ts
import { Router } from 'express';
import { MessageController } from '../controllers/MessageController';
const router = Router();

router.put('/:messageId', MessageController.updateMessage);

export default router;
