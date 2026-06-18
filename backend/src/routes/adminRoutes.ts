import { Router } from 'express';
import { getDashboardSummary, getStudents, createStudent, updateStudent, deleteStudent, getStudentExamResults, getAllStudentsSubjectScores } from '../controllers/adminController';
import { authenticateUser, authorizeRoles } from '../middleware/auth';

const router = Router();

// Apply ADMIN role authorization on all routes in this file
router.use(authenticateUser);
router.use(authorizeRoles('ADMIN'));

router.get('/dashboard', getDashboardSummary);
router.get('/students', getStudents);
router.get('/students/subject-scores', getAllStudentsSubjectScores);
router.get('/students/:id/results', getStudentExamResults);
router.post('/students', createStudent);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

export default router;
