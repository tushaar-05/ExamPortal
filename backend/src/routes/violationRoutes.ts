import { Router } from 'express';
import { logViolation } from '../controllers/violationController';
import { authenticateUser, authorizeRoles } from '../middleware/auth';

const router = Router();

// Violations require STUDENT role (since students take the exams)
router.use(authenticateUser, authorizeRoles('STUDENT'));

router.post('/', logViolation);

export default router;
