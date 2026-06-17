import { Router } from 'express';
import { getStudentExams, getExamForSession, submitExam, getStudentScores, getSubmissionReview, uploadProfilePic, getLeaderboard } from '../controllers/studentController';
import { authenticateUser, authorizeRoles } from '../middleware/auth';
import { upload } from '../utils/upload';

const router = Router();

// All student routes require STUDENT role
router.use(authenticateUser, authorizeRoles('STUDENT'));

router.get('/exams', getStudentExams);
router.get('/scores', getStudentScores);
router.get('/leaderboard', getLeaderboard);
router.get('/exams/:id/review', getSubmissionReview);
router.get('/exams/:id', getExamForSession);
router.post('/exams/:id/submit', submitExam);
router.post('/profile/pic', upload.single('profilePic'), uploadProfilePic);

export default router;


