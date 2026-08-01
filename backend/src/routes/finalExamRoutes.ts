import { Router } from 'express';
import { authenticateUser, authorizeRoles } from '../middleware/auth';
import {
  adminGetFinalExams,
  adminGetFinalExamById,
  adminCreateFinalExam,
  adminUpdateFinalExam,
  adminDeleteFinalExam,
  adminGetFinalExamSubmissions,
  adminGradeFinalExamSubmission,
  adminPublishFinalExamResults,
  studentGetFinalExam,
  studentStartFinalExam,
  studentSubmitFinalExam,
  studentLogFinalExamViolation,
  studentGetFinalExamResult,
  studentSaveProctoringSnapshot,
  adminGetProctoringSnapshots,
} from '../controllers/finalExamController';

const router = Router();

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/admin/final-exam', authenticateUser, authorizeRoles('ADMIN'), adminGetFinalExams);
router.get('/admin/final-exam/:id', authenticateUser, authorizeRoles('ADMIN'), adminGetFinalExamById);
router.post('/admin/final-exam', authenticateUser, authorizeRoles('ADMIN'), adminCreateFinalExam);
router.put('/admin/final-exam/:id', authenticateUser, authorizeRoles('ADMIN'), adminUpdateFinalExam);
router.delete('/admin/final-exam/:id', authenticateUser, authorizeRoles('ADMIN'), adminDeleteFinalExam);
router.get('/admin/final-exam/:id/submissions', authenticateUser, authorizeRoles('ADMIN'), adminGetFinalExamSubmissions);
router.put('/admin/final-exam/submissions/:submissionId/grade', authenticateUser, authorizeRoles('ADMIN'), adminGradeFinalExamSubmission);
router.put('/admin/final-exam/:id/publish', authenticateUser, authorizeRoles('ADMIN'), adminPublishFinalExamResults);
router.get('/admin/final-exam/:id/snapshots', authenticateUser, authorizeRoles('ADMIN'), adminGetProctoringSnapshots);

// ── Student routes ────────────────────────────────────────────────────────────
router.get('/student/final-exam', authenticateUser, studentGetFinalExam);
router.get('/student/final-exam/:id/result', authenticateUser, studentGetFinalExamResult);
router.post('/student/final-exam/:id/start', authenticateUser, studentStartFinalExam);
router.post('/student/final-exam/:id/submit', authenticateUser, studentSubmitFinalExam);
router.post('/student/final-exam/:id/violation', authenticateUser, studentLogFinalExamViolation);
router.post('/student/final-exam/:id/snapshot', authenticateUser, studentSaveProctoringSnapshot);

export default router;


