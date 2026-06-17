import { Router } from 'express';
import { register, login, logout, me, changePassword } from '../controllers/authController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticateUser, me);
router.put('/change-password', authenticateUser, changePassword);

export default router;
