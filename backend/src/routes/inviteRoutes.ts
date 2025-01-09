// src/routes/messageRoutes.ts
import { Router } from 'express';
import InviteController from '../controllers/InviteController';
const router = Router();

router.post('/', InviteController.createInvites);
router.get('/:inviteId', InviteController.getInvite);
router.delete('/:inviteId', InviteController.deleteInvite);
router.put('/:inviteId', InviteController.updateInvite);
router.get('/invites', InviteController.getInvites);
export default router;
