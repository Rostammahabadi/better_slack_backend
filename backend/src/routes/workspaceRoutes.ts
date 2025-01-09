// src/routes/userRoutes.ts
import { Router } from 'express';
import { checkJwt, debugAuth } from '../middleware/auth';
import { WorkspaceController } from '../controllers/WorkspaceController';
import { ChannelController } from '../controllers/ChannelController';
const router = Router();
// Apply middleware
router.use(debugAuth); // Optional: for debugging
router.use(checkJwt);  // Auth0 JWT verification

router.get('/:workspaceId', WorkspaceController.getWorkspace);
router.get('/:workspaceId/channels', WorkspaceController.getWorkspaceChannels);
router.post('/:workspaceId/channels', ChannelController.createChannel);
export default router;