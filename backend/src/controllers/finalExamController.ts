import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const finalExamOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  imageUrl: z.string().nullable().optional(),
});

const finalExamQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  imageUrl: z.string().nullable().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  points: z.number().min(0),
  type: z.enum(['MCQ', 'SUBJECTIVE']),
  options: z.array(finalExamOptionSchema).optional().nullable(),
  correctOptionId: z.string().nullable().optional(),
  correctSubjectiveAnswer: z.string().nullable().optional(),
  correctAnswerKeywords: z.string().nullable().optional(),
}).refine((data) => {
  if (data.type === 'MCQ') {
    return (data.options && data.options.length >= 2) &&
      (data.correctOptionId && data.correctOptionId.trim() !== '');
  }
  return true;
}, { message: 'MCQ questions require at least 2 options and a correct option.', path: ['options'] });

const finalExamSubjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  questions: z.array(finalExamQuestionSchema).default([]),
});

const createFinalExamSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  syllabus: z.string().nullable().optional(),
  durationMinutes: z.number().min(1),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
  gracePeriodSeconds: z.number().min(5).max(60).default(10),
  subjects: z.array(finalExamSubjectSchema).default([]),
});

const updateFinalExamSchema = createFinalExamSchema.partial().extend({
  title: z.string().min(1, 'Title is required').optional(),
  startTime: z.string().datetime({ offset: true }).optional(),
  endTime: z.string().datetime({ offset: true }).optional(),
});

// ─── Admin: CRUD ──────────────────────────────────────────────────────────────

// GET /api/admin/final-exam — list all final exams
export const adminGetFinalExams = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const finalExams = await prisma.finalExam.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ finalExams });
  } catch (err) {
    console.error('Error fetching final exams:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/final-exam/:id
export const adminGetFinalExamById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const finalExam = await prisma.finalExam.findUnique({ where: { id } });
    if (!finalExam) return res.status(404).json({ message: 'Final exam not found' });
    return res.status(200).json({ finalExam });
  } catch (err) {
    console.error('Error fetching final exam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/admin/final-exam
export const adminCreateFinalExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createFinalExamSchema.parse(req.body);

    const startDt = new Date(data.startTime);
    const endDt = new Date(data.endTime);
    if (endDt <= startDt) {
      return res.status(400).json({ message: 'End time must be after start time.' });
    }

    const finalExam = await prisma.finalExam.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        instructions: data.instructions ?? null,
        syllabus: data.syllabus ?? null,
        durationMinutes: data.durationMinutes,
        startTime: startDt,
        endTime: endDt,
        gracePeriodSeconds: data.gracePeriodSeconds,
        subjects: data.subjects as any,
      },
    });

    return res.status(201).json({ message: 'Final exam created successfully', finalExam });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    console.error('Error creating final exam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/admin/final-exam/:id
export const adminUpdateFinalExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.finalExam.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Final exam not found' });

    const data = updateFinalExamSchema.parse(req.body);

    const startDt = data.startTime ? new Date(data.startTime) : existing.startTime;
    const endDt = data.endTime ? new Date(data.endTime) : existing.endTime;
    if (endDt <= startDt) {
      return res.status(400).json({ message: 'End time must be after start time.' });
    }

    const updated = await prisma.finalExam.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        description: data.description !== undefined ? data.description : existing.description,
        instructions: data.instructions !== undefined ? data.instructions : existing.instructions,
        syllabus: data.syllabus !== undefined ? data.syllabus : existing.syllabus,
        durationMinutes: data.durationMinutes ?? existing.durationMinutes,
        startTime: startDt,
        endTime: endDt,
        gracePeriodSeconds: data.gracePeriodSeconds ?? existing.gracePeriodSeconds,
        subjects: data.subjects !== undefined ? (data.subjects as any) : (existing.subjects as any),
      },
    });

    return res.status(200).json({ message: 'Final exam updated successfully', finalExam: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    console.error('Error updating final exam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/admin/final-exam/:id
export const adminDeleteFinalExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.finalExam.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Final exam not found' });

    await prisma.finalExam.delete({ where: { id } });
    return res.status(200).json({ message: 'Final exam deleted successfully' });
  } catch (err) {
    console.error('Error deleting final exam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/final-exam/:id/submissions
export const adminGetFinalExamSubmissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const submissions = await prisma.finalExamSubmission.findMany({
      where: { finalExamId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const enriched = submissions.map((sub: any) => ({
      ...sub,
      userName: sub.user?.name || 'Unknown',
      userEmail: sub.user?.email || '',
    }));

    return res.status(200).json({ submissions: enriched });
  } catch (err) {
    console.error('Error fetching final exam submissions:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Student: Access ──────────────────────────────────────────────────────────

// GET /api/student/final-exam — returns the most recent FinalExam with student status
export const studentGetFinalExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const finalExam = await prisma.finalExam.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!finalExam) return res.status(200).json({ finalExam: null });

    const now = new Date();
    let examStatus: 'UPCOMING' | 'LIVE' | 'ENDED' = 'UPCOMING';
    if (now >= finalExam.startTime && now <= finalExam.endTime) examStatus = 'LIVE';
    else if (now > finalExam.endTime) examStatus = 'ENDED';

    // Check student's submission
    const submission = await prisma.finalExamSubmission.findFirst({
      where: { finalExamId: finalExam.id, userId },
    });

    // Strip correct answers from subjects
    const safeSubjects = (finalExam.subjects as any[]).map((subject: any) => ({
      id: subject.id,
      name: subject.name,
      questions: (subject.questions as any[]).map((q: any) => {
        const { correctOptionId, correctSubjectiveAnswer, correctAnswerKeywords, ...safe } = q;
        return safe;
      }),
    }));

    const isPublished = submission?.isPublished ?? false;
    const isGraded = submission?.graded ?? false;

    return res.status(200).json({
      finalExam: {
        id: finalExam.id,
        title: finalExam.title,
        description: finalExam.description,
        instructions: finalExam.instructions,
        syllabus: finalExam.syllabus,
        durationMinutes: finalExam.durationMinutes,
        startTime: finalExam.startTime,
        endTime: finalExam.endTime,
        gracePeriodSeconds: finalExam.gracePeriodSeconds,
        passPercentage: finalExam.passPercentage || 40,
        subjects: safeSubjects,
        status: examStatus,
        submitted: !!submission,
        isPublished,
        isGraded,
        score: submission
          ? (isPublished
              ? `${submission.score} / ${submission.totalPoints}`
              : 'Under Evaluation')
          : null,
      },
    });
  } catch (err) {
    console.error('Error fetching final exam for student:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/student/final-exam/:id/start — create or fetch attempt
export const studentStartFinalExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const finalExam = await prisma.finalExam.findUnique({ where: { id } });
    if (!finalExam) return res.status(404).json({ message: 'Final exam not found' });

    const now = new Date();
    if (now < finalExam.startTime) {
      return res.status(403).json({ message: 'The exam has not started yet.' });
    }
    if (now > finalExam.endTime) {
      return res.status(403).json({ message: 'The exam has ended.' });
    }

    const existingSubmission = await prisma.finalExamSubmission.findFirst({
      where: { finalExamId: id, userId },
    });
    if (existingSubmission) {
      return res.status(403).json({ message: 'You have already submitted this exam.' });
    }

    let attempt = await prisma.finalExamAttempt.findFirst({
      where: { finalExamId: id, userId },
    });

    if (attempt && (attempt.status === 'TERMINATED' || attempt.remainingChances <= 0)) {
      return res.status(403).json({ message: 'Your exam session has been terminated.' });
    }

    if (!attempt) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      attempt = await prisma.finalExamAttempt.create({
        data: {
          finalExamId: id,
          userId,
          userName: user?.name ?? undefined,
          userEmail: user?.email ?? undefined,
          remainingChances: 3,
          status: 'STARTED',
        },
      });
    }

    return res.status(200).json({
      attemptId: attempt.id,
      remainingChances: attempt.remainingChances,
    });
  } catch (err) {
    console.error('Error starting final exam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/student/final-exam/:id/submit
const submitFinalExamSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    subjectId: z.string(),
    optionId: z.string().nullable().optional(),
    subjectiveAnswer: z.string().nullable().optional(),
  })),
  isTerminated: z.boolean().optional(),
});

export const studentSubmitFinalExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { answers, isTerminated } = submitFinalExamSchema.parse(req.body);

    const existingSubmission = await prisma.finalExamSubmission.findFirst({
      where: { finalExamId: id, userId },
    });
    if (existingSubmission) {
      return res.status(403).json({ message: 'You have already submitted this exam.' });
    }

    const finalExam = await prisma.finalExam.findUnique({ where: { id } });
    if (!finalExam) return res.status(404).json({ message: 'Final exam not found' });

    const attempt = await prisma.finalExamAttempt.findFirst({
      where: { finalExamId: id, userId, status: 'STARTED' },
    });

    const newStatus = isTerminated ? 'TERMINATED' : 'SUBMITTED';
    if (attempt) {
      await prisma.finalExamAttempt.update({
        where: { id: attempt.id },
        data: {
          status: newStatus,
          remainingChances: isTerminated ? 0 : attempt.remainingChances,
        },
      });
    }

    // Grade answers
    let score = 0;
    let totalPoints = 0;
    let hasSubjective = false;

    const allSubjects = finalExam.subjects as any[];
    const gradedAnswers: any[] = [];

    for (const subject of allSubjects) {
      for (const question of subject.questions) {
        totalPoints += question.points;
        if (question.type === 'SUBJECTIVE') hasSubjective = true;

        const answer = answers.find(a => a.questionId === question.id && a.subjectId === subject.id);
        let pointsEarned = 0;

        if (answer) {
          if (question.type === 'MCQ' && answer.optionId) {
            if (answer.optionId === question.correctOptionId) {
              pointsEarned = question.points;
              score += question.points;
            }
          } else if (question.type === 'SUBJECTIVE' && answer.subjectiveAnswer) {
            const studentAns = answer.subjectiveAnswer.trim().toLowerCase();
            const keywords = (question.correctAnswerKeywords || '')
              .split(',').map((k: string) => k.trim().toLowerCase()).filter((k: string) => k !== '');

            if (keywords.length > 0) {
              const matched = keywords.filter((kw: string) => studentAns.includes(kw)).length;
              pointsEarned = Math.round(question.points * (matched / keywords.length));
            } else if (question.correctSubjectiveAnswer) {
              const modelAns = question.correctSubjectiveAnswer.trim().toLowerCase();
              pointsEarned = studentAns === modelAns ? question.points : 0;
            }
            score += pointsEarned;
          }
        }

        gradedAnswers.push({
          questionId: question.id,
          subjectId: subject.id,
          optionId: answer?.optionId ?? null,
          subjectiveAnswer: answer?.subjectiveAnswer ?? null,
          pointsEarned,
        });
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });

    const submission = await prisma.finalExamSubmission.create({
      data: {
        finalExamId: id,
        userId,
        userName: user?.name ?? undefined,
        userEmail: user?.email ?? undefined,
        score,
        totalPoints,
        answers: gradedAnswers,
        graded: hasSubjective ? false : true,
      },
    });

    return res.status(200).json({
      message: 'Final exam submitted successfully',
      score: submission.score,
      totalPoints: submission.totalPoints,
      graded: submission.graded,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map(e => e.message) });
    }
    console.error('Error submitting final exam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/student/final-exam/:id/violation
export const studentLogFinalExamViolation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { attemptId, type, metadata } = req.body;
    if (!attemptId || !type) return res.status(400).json({ message: 'Missing attemptId or type' });

    const attempt = await prisma.finalExamAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (attempt.userId !== userId) return res.status(403).json({ message: 'Forbidden' });
    if (attempt.status !== 'STARTED') return res.status(400).json({ message: 'Session not active' });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    await prisma.finalExamViolation.create({
      data: {
        attemptId,
        userId,
        userName: user?.name ?? undefined,
        userEmail: user?.email ?? undefined,
        type,
        metadata: metadata ? String(metadata) : undefined,
      },
    });

    const newChances = Math.max(0, attempt.remainingChances - 1);
    const updatedAttempt = await prisma.finalExamAttempt.update({
      where: { id: attemptId },
      data: {
        remainingChances: newChances,
        status: newChances === 0 ? 'TERMINATED' : 'STARTED',
      },
    });

    return res.status(200).json({
      message: 'Violation logged',
      remainingChances: updatedAttempt.remainingChances,
    });
  } catch (err) {
    console.error('Error logging final exam violation:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Admin Grading & Result Publication ───────────────────────────────────────

// PUT /api/admin/final-exam/submissions/:submissionId/grade
export const adminGradeFinalExamSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { answers, overallFeedback, isPublished } = req.body;

    const submission = await prisma.finalExamSubmission.findUnique({
      where: { id: submissionId },
      include: { finalExam: true },
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const finalExam = submission.finalExam;
    const allSubjects = finalExam.subjects as any[];

    // Map through answers and apply admin grades & feedback
    let newScore = 0;
    const updatedAnswers = submission.answers.map((origAns: any) => {
      const gradeItem = answers?.find(
        (a: any) => a.questionId === origAns.questionId && a.subjectId === origAns.subjectId
      );

      // Find question definition
      const subject = allSubjects.find((s: any) => s.id === origAns.subjectId);
      const question = subject?.questions?.find((q: any) => q.id === origAns.questionId);
      const maxPoints = question ? question.points : 0;

      let pointsEarned: number;
      if (question && question.type === 'MCQ') {
        // MCQ: auto score or use grade item if explicitly passed
        pointsEarned = origAns.optionId === question.correctOptionId ? maxPoints : 0;
      } else {
        // Subjective: use grade item points
        pointsEarned = gradeItem
          ? Math.min(maxPoints, Math.max(0, Number(gradeItem.pointsEarned || 0)))
          : (origAns.pointsEarned ?? 0);
      }

      newScore += pointsEarned;
      const feedback = gradeItem ? (gradeItem.feedback || null) : (origAns.feedback || null);

      return {
        ...origAns,
        pointsEarned,
        feedback,
      };
    });

    const totalPoints = submission.totalPoints > 0 ? submission.totalPoints : 1;
    const percentage = Math.round((newScore / totalPoints) * 100 * 10) / 10;
    const passPercentage = finalExam.passPercentage || 40;
    const passed = percentage >= passPercentage;

    const updatedSubmission = await prisma.finalExamSubmission.update({
      where: { id: submissionId },
      data: {
        answers: updatedAnswers,
        score: newScore,
        percentage,
        passed,
        graded: true,
        isPublished: isPublished !== undefined ? isPublished : submission.isPublished,
        overallFeedback: overallFeedback !== undefined ? overallFeedback : submission.overallFeedback,
      },
    });

    return res.status(200).json({
      message: 'Submission graded successfully',
      submission: updatedSubmission,
    });
  } catch (err) {
    console.error('Error grading final exam submission:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/admin/final-exam/:id/publish — Publish all graded submissions for a final exam
export const adminPublishFinalExamResults = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const finalExam = await prisma.finalExam.findUnique({ where: { id } });
    if (!finalExam) return res.status(404).json({ message: 'Final exam not found' });

    await prisma.finalExamSubmission.updateMany({
      where: { finalExamId: id, graded: true },
      data: { isPublished: true },
    });

    return res.status(200).json({ message: 'Final exam results published successfully' });
  } catch (err) {
    console.error('Error publishing final exam results:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Student Result & Analysis ────────────────────────────────────────────────

// GET /api/student/final-exam/:id/result
export const studentGetFinalExamResult = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const submission = await prisma.finalExamSubmission.findFirst({
      where: { finalExamId: id, userId },
      include: { finalExam: true },
    });

    if (!submission) {
      return res.status(404).json({ message: 'No submission found for this exam.' });
    }

    if (!submission.isPublished) {
      return res.status(403).json({ message: 'Results are currently under evaluation.' });
    }

    const finalExam = submission.finalExam;
    const allSubjects = finalExam.subjects as any[];

    // Calculate Rank among published submissions for this FinalExam
    const publishedSubmissions = await prisma.finalExamSubmission.findMany({
      where: { finalExamId: id, isPublished: true },
      orderBy: { score: 'desc' },
    });

    const userRankIndex = publishedSubmissions.findIndex(s => s.userId === userId);
    const rank = userRankIndex >= 0 ? userRankIndex + 1 : publishedSubmissions.length;
    const totalCandidates = publishedSubmissions.length;

    // Subject-wise performance breakdown
    const subjectBreakdown = allSubjects.map((subj: any) => {
      let subjEarned = 0;
      let subjTotal = 0;

      subj.questions.forEach((q: any) => {
        subjTotal += q.points;
        const ans = submission.answers.find((a: any) => a.questionId === q.id && a.subjectId === subj.id);
        subjEarned += ans?.pointsEarned || 0;
      });

      const pct = subjTotal > 0 ? Math.round((subjEarned / subjTotal) * 100 * 10) / 10 : 0;
      return {
        subjectId: subj.id,
        subjectName: subj.name,
        score: subjEarned,
        totalPoints: subjTotal,
        percentage: pct,
        passed: pct >= (finalExam.passPercentage || 40),
      };
    });

    // Question-wise detailed analysis
    const questionAnalysis: any[] = [];

    for (const subj of allSubjects) {
      for (const q of subj.questions) {
        const studentAns = submission.answers.find((a: any) => a.questionId === q.id && a.subjectId === subj.id);
        const pointsEarned = studentAns?.pointsEarned || 0;

        let status: 'CORRECT' | 'INCORRECT' | 'PARTIAL' = 'INCORRECT';
        if (pointsEarned === q.points && q.points > 0) status = 'CORRECT';
        else if (pointsEarned > 0) status = 'PARTIAL';

        // Safe correct answer info
        let correctText = null;
        if (q.type === 'MCQ') {
          const correctOpt = q.options?.find((o: any) => o.id === q.correctOptionId);
          correctText = correctOpt ? correctOpt.text : null;
        } else {
          correctText = q.correctSubjectiveAnswer || q.correctAnswerKeywords || null;
        }

        questionAnalysis.push({
          questionId: q.id,
          subjectId: subj.id,
          subjectName: subj.name,
          questionText: q.text,
          imageUrl: q.imageUrl || null,
          difficulty: q.difficulty,
          type: q.type,
          points: q.points,
          pointsEarned,
          status,
          options: q.options || [],
          correctOptionId: q.correctOptionId || null,
          correctAnswerText: correctText,
          studentOptionId: studentAns?.optionId || null,
          studentSubjectiveAnswer: studentAns?.subjectiveAnswer || null,
          feedback: studentAns?.feedback || null,
        });
      }
    }

    const percentage = submission.percentage ?? (submission.totalPoints > 0 ? Math.round((submission.score / submission.totalPoints) * 100 * 10) / 10 : 0);
    const passed = submission.passed ?? (percentage >= (finalExam.passPercentage || 40));

    return res.status(200).json({
      result: {
        examTitle: finalExam.title,
        score: submission.score,
        totalPoints: submission.totalPoints,
        percentage,
        passed,
        rank,
        totalCandidates,
        overallFeedback: submission.overallFeedback || null,
        subjectBreakdown,
        questionAnalysis,
      },
    });
  } catch (err) {
    console.error('Error fetching final exam result:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

