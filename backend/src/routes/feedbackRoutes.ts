import { Router } from 'express';
import { submitFeedback } from '../controllers/feedbackController';
import { authenticateUser, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateUser, authorizeRoles('STUDENT'));
router.post('/feedback', submitFeedback);

export default router;
