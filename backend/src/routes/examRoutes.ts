import { Router } from 'express';
import { getExams, getExamById, createExam, updateExam, deleteExam } from '../controllers/examController';
import { authenticateUser, authorizeRoles } from '../middleware/auth';

const router = Router();

// Apply ADMIN role checks to all routes in this file
router.use(authenticateUser);
router.use(authorizeRoles('ADMIN'));

router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

export default router;
