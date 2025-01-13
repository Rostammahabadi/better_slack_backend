// src/routes/userRoutes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { checkJwt, debugAuth } from '../middleware/auth';

const router = Router();
router.use(debugAuth); // Optional: for debugging
router.use(checkJwt);  // Auth0 JWT verification
 
router.get('/me', UserController.getUser);
router.put('/me', UserController.updateUser);
router.post('/status', UserController.setStatus);
router.delete('/status', UserController.clearStatus);

export default router;