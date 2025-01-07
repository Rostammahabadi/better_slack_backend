// src/routes/reactionRoutes.ts
import express from 'express';
import { checkJwt } from '../middleware/auth';
import ReactionController from '../controllers/ReactionController';

const router = express.Router();

router.post('/messages/:messageId/reactions', checkJwt, ReactionController.addReaction);
router.delete('/messages/:messageId/reactions/:reactionId', checkJwt, ReactionController.removeReaction);

export default router;
