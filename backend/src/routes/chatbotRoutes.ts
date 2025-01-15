import { Router } from 'express';
import { ChatbotController } from '../controllers/ChatbotController';
import { checkJwt } from '../middleware/auth';

const router = Router();

router.use(checkJwt);
router.get('/conversation/:workspaceId', ChatbotController.getConversation);
router.post('/message', ChatbotController.saveMessage);

export default router; 