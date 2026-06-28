import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { getUploadedImageUrl } from '../utils/upload';

// ─── 1. Get List of Exams for Student Dashboard ────────────────────────────────
export const getStudentExams = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Fetch all exams
    const exams = await prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Fetch submissions for this user
    const submissions = await prisma.examSubmission.findMany({
      where: { userId },
    });

    // Fetch attempts for this user to check for termination/lock
    const attempts = await prisma.examAttempt.findMany({
      where: { userId },
    });

    // Map the exams to the student view
    const formattedExams = exams.map((exam) => {
      const submission = submissions.find(sub => sub.examId === exam.id);
      const attempt = attempts.find(att => att.examId === exam.id);
      
      let status = 'AVAILABLE';
      if (submission) {
        status = 'COMPLETED';
      }
      if (attempt && attempt.status === 'TERMINATED') {
        status = 'TERMINATED';
      }

      // Scheduling
      const now = new Date();
      if (exam.startTime && now < new Date(exam.startTime)) {
        status = 'SCHEDULED';
      } else if (exam.endTime && now > new Date(exam.endTime) && status === 'AVAILABLE') {
        status = 'EXPIRED';
      }
      
      const hasEndTime = !!exam.endTime;
      const isBeforeDeadline = hasEndTime && now < new Date(exam.endTime);

      return {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        questionsCount: exam.questions.length,
        startTime: exam.startTime,
        endTime: exam.endTime,
        subject: exam.subject,
        status,
        type: exam.type,
        score: submission ? (
          isBeforeDeadline ? (
            undefined
          ) : (
            exam.questions.some((q: any) => q.type === 'SUBJECTIVE') && submission.graded === false
              ? "Pending Grading"
              : `${submission.score} / ${submission.totalPoints}`
          )
        ) : undefined
      };
    });

    return res.status(200).json({ exams: formattedExams });
  } catch (err) {
    console.error('Error fetching student exams:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── 2. Get Single Exam for Session (Without correct answers) ───────────────────
export const getExamForSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Check if user already submitted or was terminated
    const existingSubmission = await prisma.examSubmission.findFirst({
      where: { userId, examId: id }
    });

    if (existingSubmission) {
      return res.status(403).json({ message: 'You have already completed this exam.' });
    }

    // Find or create ExamAttempt
    let attempt = await prisma.examAttempt.findFirst({
      where: { userId, examId: id }
    });

    if (attempt) {
      if (attempt.status === 'SUBMITTED' || attempt.status === 'TERMINATED' || attempt.remainingChances <= 0) {
        return res.status(403).json({ message: 'This exam is locked or has already been completed.' });
      }
    } else {
      // Fetch user name/email to denormalise onto the attempt record
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      attempt = await prisma.examAttempt.create({
        data: {
          userId,
          examId: id,
          userName:  user?.name  ?? undefined,
          userEmail: user?.email ?? undefined,
          remainingChances: 3,
          status: 'STARTED'
        }
      });
    }

    const exam = await prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Enforce scheduling window
    const now = new Date();
    if (exam.startTime && now < exam.startTime) {
      return res.status(403).json({
        message: `This exam has not started yet. It will be available from ${exam.startTime.toLocaleString()}.`
      });
    }
    if (exam.endTime && now > exam.endTime) {
      return res.status(403).json({
        message: `This exam has ended. The window closed on ${exam.endTime.toLocaleString()}.`
      });
    }

    // Strip out the correctOptionId from questions
    const safeQuestions = exam.questions.map(q => {
      const { correctOptionId, ...safeQuestion } = q;
      return safeQuestion;
    });

    const safeExam = {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      totalPoints: exam.totalPoints,
      questions: safeQuestions
    };

    return res.status(200).json({
      exam: safeExam,
      attemptId: attempt.id,
      remainingChances: attempt.remainingChances
    });
  } catch (err) {
    console.error('Error fetching exam for session:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── 3. Submit Exam Answers and Grade ───────────────────────────────────────────

const submitExamSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    optionId: z.string().nullable().optional(),
    subjectiveAnswer: z.string().nullable().optional()
  })),
  isTerminated: z.boolean().optional()
});

export const submitExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const validatedData = submitExamSchema.parse(req.body);

    // Prevent duplicate submissions
    const existingSubmission = await prisma.examSubmission.findFirst({
      where: { userId, examId: id }
    });

    if (existingSubmission) {
      return res.status(403).json({ message: 'You have already completed this exam.' });
    }

    // Fetch the real exam with correct answers
    const exam = await prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Find started attempt
    const attempt = await prisma.examAttempt.findFirst({
      where: { userId, examId: id, status: 'STARTED' }
    });

    const status = validatedData.isTerminated ? 'TERMINATED' : 'SUBMITTED';

    if (attempt) {
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: {
          status,
          remainingChances: validatedData.isTerminated ? 0 : attempt.remainingChances
        }
      });
    }

    // Calculate score
    let score = 0;
    
    if (exam.type !== 'SUBJECTIVE') {
      validatedData.answers.forEach(answer => {
        const question = exam.questions.find(q => q.id === answer.questionId);
        if (question) {
          if (question.type === 'SUBJECTIVE') {
            const studentAnsText = (answer.subjectiveAnswer || '').trim().toLowerCase();
            const modelAns = (question.correctSubjectiveAnswer || '').trim().toLowerCase();
            const keywordsStr = question.correctAnswerKeywords || '';
            
            if (studentAnsText.length > 0) {
              if (keywordsStr.trim() !== '') {
                const keywords = keywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(k => k !== '');
                if (keywords.length > 0) {
                  let matched = 0;
                  keywords.forEach(kw => {
                    if (studentAnsText.includes(kw)) {
                      matched++;
                    }
                  });
                  const matchRatio = matched / keywords.length;
                  score += Math.round(question.points * matchRatio);
                } else {
                  score += question.points;
                }
              } else {
                if (studentAnsText === modelAns) {
                  score += question.points;
                } else if (studentAnsText.length >= 10) {
                  score += Math.round(question.points * 0.5); // 50% credit fallback
                }
              }
            }
          } else {
            // MCQ
            if (answer.optionId === question.correctOptionId) {
              score += question.points;
            }
          }
        }
      });
    }

    // Create submission — include denormalised user identity
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    const submission = await prisma.examSubmission.create({
      data: {
        userId,
        examId: id,
        userName:  user?.name  ?? undefined,
        userEmail: user?.email ?? undefined,
        score,
        totalPoints: exam.totalPoints,
        answers: validatedData.answers.map(ans => ({
          questionId: ans.questionId,
          optionId: ans.optionId || null,
          subjectiveAnswer: ans.subjectiveAnswer || null,
          pointsEarned: null,
        })),
        graded: exam.questions.some((q: any) => q.type === 'SUBJECTIVE') ? false : true,
      }
    });

    // Automatically update the user's general 'score' field to be the average percentage of all their exams
    const allSubmissions = await prisma.examSubmission.findMany({
      where: { userId }
    });

    let totalEarned = 0;
    let totalPossible = 0;
    allSubmissions.forEach(sub => {
      totalEarned += sub.score;
      totalPossible += sub.totalPoints;
    });

    const averagePercentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    
    await prisma.user.update({
      where: { id: userId },
      data: { score: `${averagePercentage}%` }
    });

    const hasEndTime = !!exam.endTime;
    const isBeforeDeadline = hasEndTime && new Date() < new Date(exam.endTime);

    return res.status(200).json({ 
      message: 'Exam submitted successfully',
      score: isBeforeDeadline ? null : submission.score,
      totalPoints: submission.totalPoints
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    console.error('Error submitting exam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── 4. Get Student Scores Grouped by Subject ──────────────────────────────────
export const getStudentScores = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Fetch all exams
    const exams = await prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Fetch submissions for this user
    const submissions = await prisma.examSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch attempts for this user
    const attempts = await prisma.examAttempt.findMany({
      where: { userId },
    });

    // Defining the 4 official subjects
    const SUBJECTS = [
      'Git and Github',
      'AI fundamentals',
      'Automation with N8N',
      'AI tools and Productivity'
    ];

    // Build subject-wise results
    const subjectStats = SUBJECTS.map((subject) => {
      // Find all exams matching this subject
      const subjectExams = exams.filter(e => e.subject === subject);
      const totalExams = subjectExams.length;

      // Find submissions for exams in this subject
      const subjectSubmissions = submissions.filter(sub =>
        subjectExams.some(e => e.id === sub.examId)
      );
      const examsCompleted = subjectSubmissions.length;

      // Calculate total potential and total achieved scores
      let totalMaxPoints = 0;
      let totalAchievedPoints = 0;
      const now = new Date();
      
      subjectSubmissions.forEach(sub => {
        const exam = subjectExams.find(e => e.id === sub.examId);
        const isBeforeDeadline = exam && exam.endTime && now < new Date(exam.endTime);
        if (!isBeforeDeadline) {
          totalMaxPoints += sub.totalPoints;
          totalAchievedPoints += sub.score;
        }
      });

      const averagePercentage = totalMaxPoints > 0 
        ? Math.round((totalAchievedPoints / totalMaxPoints) * 100) 
        : 0;

      // Detail records of exams in this subject
      const examDetails = subjectExams.map(exam => {
        const sub = subjectSubmissions.find(s => s.examId === exam.id);
        const attempt = attempts.find(att => att.examId === exam.id);

        let status = 'AVAILABLE';
        if (sub) {
          status = 'COMPLETED';
        } else if (attempt && attempt.status === 'TERMINATED') {
          status = 'TERMINATED';
        } else {
          // Scheduling
          const now = new Date();
          if (exam.startTime && now < new Date(exam.startTime)) {
            status = 'SCHEDULED';
          } else if (exam.endTime && now > new Date(exam.endTime)) {
            status = 'EXPIRED';
          }
        }

        const nowTime = new Date();
        const isBeforeDeadline = exam.endTime && nowTime < new Date(exam.endTime);

        return {
          id: exam.id,
          title: exam.title,
          totalPoints: exam.totalPoints,
          score: sub ? (isBeforeDeadline ? null : sub.score) : null,
          graded: sub ? (sub.graded !== false) : true,
          scoreHidden: !!(sub && isBeforeDeadline),
          status,
          dateTaken: sub ? sub.createdAt : null,
        };
      });

      return {
        subject,
        totalExams,
        examsCompleted,
        averagePercentage,
        exams: examDetails
      };
    });

    // Also collect unassigned/other exams if any exist
    const otherExams = exams.filter(e => !e.subject || !SUBJECTS.includes(e.subject));
    let unassignedStats = null;

    if (otherExams.length > 0) {
      const otherSubmissions = submissions.filter(sub =>
        otherExams.some(e => e.id === sub.examId)
      );

      let totalMaxPoints = 0;
      let totalAchievedPoints = 0;
      const now = new Date();
      otherSubmissions.forEach(sub => {
        const exam = otherExams.find(e => e.id === sub.examId);
        const isBeforeDeadline = exam && exam.endTime && now < new Date(exam.endTime);
        if (!isBeforeDeadline) {
          totalMaxPoints += sub.totalPoints;
          totalAchievedPoints += sub.score;
        }
      });

      const averagePercentage = totalMaxPoints > 0 
        ? Math.round((totalAchievedPoints / totalMaxPoints) * 100) 
        : 0;

      const details = otherExams.map(exam => {
        const sub = otherSubmissions.find(s => s.examId === exam.id);
        const attempt = attempts.find(att => att.examId === exam.id);

        let status = 'AVAILABLE';
        if (sub) {
          status = 'COMPLETED';
        } else if (attempt && attempt.status === 'TERMINATED') {
          status = 'TERMINATED';
        } else {
          const now = new Date();
          if (exam.startTime && now < new Date(exam.startTime)) {
            status = 'SCHEDULED';
          } else if (exam.endTime && now > new Date(exam.endTime)) {
            status = 'EXPIRED';
          }
        }

        const nowTime = new Date();
        const isBeforeDeadline = exam.endTime && nowTime < new Date(exam.endTime);

        return {
          id: exam.id,
          title: exam.title,
          totalPoints: exam.totalPoints,
          score: sub ? (isBeforeDeadline ? null : sub.score) : null,
          graded: sub ? (sub.graded !== false) : true,
          scoreHidden: !!(sub && isBeforeDeadline),
          status,
          dateTaken: sub ? sub.createdAt : null,
        };
      });

      unassignedStats = {
        subject: 'Unassigned',
        totalExams: otherExams.length,
        examsCompleted: otherSubmissions.length,
        averagePercentage,
        exams: details
      };
    }

    const payload = {
      subjects: subjectStats,
      unassigned: unassignedStats,
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error('Error fetching student scores:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── 5. Get Submission Review (with correct answers) ─────────────────────────
export const getSubmissionReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params; // exam ID

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Fetch the student's submission for this exam
    const submission = await prisma.examSubmission.findFirst({
      where: { userId, examId: id }
    });

    if (!submission) {
      return res.status(403).json({ message: 'You must submit the exam before reviewing correct answers.' });
    }

    // Fetch the complete exam (including correct answers)
    const exam = await prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Block review for all exams if they are accessed before the deadline (endTime)
    if (exam.endTime && new Date() < new Date(exam.endTime)) {
      return res.status(403).json({
        message: `Review is not allowed until after the exam deadline: ${new Date(exam.endTime).toLocaleString()}`
      });
    }

    // Match each question with the student's selection
    const questionReviews = exam.questions.map(q => {
      const studentAns = submission.answers.find(a => a.questionId === q.id);
      
      let pointsEarned = 0;
      if (studentAns) {
        // If the submission has already been graded (pointsEarned is stored), always use that value.
        // Only fall back to auto-calculation when pointsEarned has never been set (null).
        if ((studentAns as any).pointsEarned !== null && (studentAns as any).pointsEarned !== undefined) {
          pointsEarned = (studentAns as any).pointsEarned;
        } else if (q.type === 'SUBJECTIVE') {
          const studentAnsText = (studentAns.subjectiveAnswer || '').trim().toLowerCase();
          const keywordsStr = q.correctAnswerKeywords || '';
          
          if (studentAnsText.length > 0) {
            if (keywordsStr.trim() !== '') {
              const keywords = keywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(k => k !== '');
              if (keywords.length > 0) {
                let matched = 0;
                keywords.forEach(kw => {
                  if (studentAnsText.includes(kw)) matched++;
                });
                const matchRatio = matched / keywords.length;
                pointsEarned = Math.round(q.points * matchRatio);
              } else {
                pointsEarned = q.points;
              }
            } else {
              const modelAns = (q.correctSubjectiveAnswer || '').trim().toLowerCase();
              if (studentAnsText === modelAns) {
                pointsEarned = q.points;
              } else if (studentAnsText.length >= 10) {
                pointsEarned = Math.round(q.points * 0.5);
              }
            }
          }
        } else {
          // MCQ: auto-calculate from correct answer
          if (studentAns.optionId === q.correctOptionId) {
            pointsEarned = q.points;
          }
        }
      }

      return {
        id: q.id,
        text: q.text,
        imageUrl: q.imageUrl,
        difficulty: q.difficulty,
        points: q.points,
        pointsEarned,
        type: q.type || 'MCQ',
        options: q.options,
        correctOptionId: q.correctOptionId,
        correctSubjectiveAnswer: q.correctSubjectiveAnswer,
        correctAnswerKeywords: q.correctAnswerKeywords,
        selectedOptionId: studentAns ? studentAns.optionId : null,
        selectedSubjectiveAnswer: studentAns ? studentAns.subjectiveAnswer : null,
        subjectiveAnswer: studentAns ? studentAns.subjectiveAnswer : null,
        feedback: studentAns ? studentAns.feedback : null,
      };
    });

    return res.status(200).json({
      examTitle: exam.title,
      totalPoints: exam.totalPoints,
      score: submission.score,
      durationMinutes: exam.durationMinutes,
      dateSubmitted: submission.createdAt,
      graded: submission.graded,
      type: exam.type || 'MCQ',
      questions: questionReviews
    });

  } catch (err) {
    console.error('Error fetching submission review:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── 6. Upload / Replace Profile Picture ──────────────────────────────────────
export const uploadProfilePic = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    const imageUrl = getUploadedImageUrl(req, req.file);

    await prisma.user.update({
      where: { id: userId },
      data: { profilePic: imageUrl },
    });

    return res.status(200).json({ message: 'Profile picture updated.', profilePic: imageUrl });
  } catch (err) {
    console.error('Error uploading profile pic:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── 7. Get Leaderboard ────────────────────────────────────────────────────────
export const getLeaderboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Fetch all students
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, profilePic: true },
    });

    // Fetch all submissions
    const allSubmissions = await prisma.examSubmission.findMany({
      select: { userId: true, score: true, totalPoints: true, examId: true, createdAt: true },
    });

    // Fetch all exams for subject mapping
    const allExams = await prisma.exam.findMany({
      select: { id: true, subject: true, type: true, endTime: true },
    });
    const examSubjectMap = new Map(allExams.map(e => [e.id, e.subject ?? 'Unassigned']));

    const SUBJECTS = ['Git and Github', 'AI fundamentals', 'Automation with N8N', 'AI tools and Productivity'];

    const ranked = students.map(student => {
      const subs = allSubmissions.filter(s => s.userId === student.id);

      let totalEarned = 0;
      let totalPossible = 0;

      const subjectScores: Record<string, { earned: number; possible: number }> = {};
      SUBJECTS.forEach(s => { subjectScores[s] = { earned: 0, possible: 0 }; });

      subs.forEach(sub => {
        totalEarned   += sub.score;
        totalPossible += sub.totalPoints;
        const subject = examSubjectMap.get(sub.examId) ?? 'Unassigned';
        if (subjectScores[subject]) {
          subjectScores[subject].earned   += sub.score;
          subjectScores[subject].possible += sub.totalPoints;
        }
      });

      const overallPct = totalPossible > 0
        ? Math.round((totalEarned / totalPossible) * 100)
        : 0;

      const lastSubmissionTime = subs.length > 0
        ? Math.max(...subs.map(s => new Date(s.createdAt).getTime()))
        : Infinity;

      return {
        id:           student.id,
        name:         student.name,
        profilePic:   student.profilePic ?? null,
        examsCompleted: subs.length,
        totalEarned,
        totalPossible,
        overallPct,
        lastSubmissionTime,
        subjectScores: SUBJECTS.map(s => ({
          subject:  s,
          earned:   subjectScores[s].earned,
          possible: subjectScores[s].possible,
          pct:      subjectScores[s].possible > 0
            ? Math.round((subjectScores[s].earned / subjectScores[s].possible) * 100)
            : null,
        })),
      };
    });

    // Sort: by overallPct desc, then lastSubmissionTime asc (person who finished early), then name asc
    ranked.sort((a, b) => {
      if (b.overallPct !== a.overallPct) {
        return b.overallPct - a.overallPct;
      }
      if (a.lastSubmissionTime !== b.lastSubmissionTime) {
        return a.lastSubmissionTime - b.lastSubmissionTime;
      }
      return a.name.localeCompare(b.name);
    });

    return res.status(200).json({ leaderboard: ranked });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

