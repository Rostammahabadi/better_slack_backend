// src/routes/messageRoutes.ts
import { Router } from 'express';
import { InviteController } from '../controllers/InviteController';
import { checkJwt } from '../middleware/auth';
import { inviteRateLimiter } from '../middleware/rateLimiter';
import { checkWorkspaceAccess } from '../middleware/workspaceAccess';

const router = Router();

// Public routes (with rate limiting)
router.get('/verify/:inviteId', inviteRateLimiter, InviteController.validateInvite);
router.get('/:inviteId', inviteRateLimiter, InviteController.getInvite);
router.post('/accept', inviteRateLimiter, InviteController.acceptInvite);

// Protected routes (need authentication and workspace access)
router.use(checkJwt);
router.post('/', inviteRateLimiter, checkWorkspaceAccess, InviteController.createInvites);
router.get('/workspace/:workspaceId', checkWorkspaceAccess, InviteController.getWorkspaceInvites);

export default router;
