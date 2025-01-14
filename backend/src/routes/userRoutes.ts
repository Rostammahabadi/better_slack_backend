// src/routes/userRoutes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { checkJwt, debugAuth } from '../middleware/auth';

const router = Router();
router.post('/', UserController.createUser);


router.use(debugAuth); // Optional: for debugging
router.use(checkJwt);  // Auth0 JWT verification
 
router.get('/me', UserController.getUser);
router.put('/me', UserController.updateUser);
router.post('/status', UserController.setStatus);
router.get('/', UserController.getUsers);
router.delete('/status', UserController.clearStatus);

export default router;