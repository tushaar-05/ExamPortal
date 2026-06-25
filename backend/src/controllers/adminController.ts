import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { findUserByEmail, normalizeEmail } from '../utils/email';

const createStudentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  score: z.string().optional().or(z.literal('')),
});

const updateStudentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  score: z.string().optional().or(z.literal('')),
});

// ─── Admin Dashboard Summary ──────────────────────────────────────────────────
export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalExams,
      activeStudents,
      pendingReviews,
      recentViolations,
      totalSubmissions,
      totalAttempts,
      activeModules,
      recentExams,
      latestViolations,
    ] = await Promise.all([
      prisma.exam.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.examAttempt.count({ where: { status: 'STARTED' } }),
      prisma.violation.count({ where: { timestamp: { gte: last24Hours } } }),
      prisma.examSubmission.count(),
      prisma.examAttempt.count(),
      prisma.exam.count({
        where: {
          AND: [
            { OR: [{ startTime: null }, { startTime: { lte: now } }] },
            { OR: [{ endTime: null }, { endTime: { gte: now } }] },
          ],
        },
      }),
      prisma.exam.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          subject: true,
          totalPoints: true,
          durationMinutes: true,
          createdAt: true,
          _count: {
            select: {
              submissions: true,
              attempts: true,
            },
          },
        },
      }),
      prisma.violation.findMany({
        take: 6,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          type: true,
          timestamp: true,
          userId: true,
        },
      }),
    ]);

    const violationUserIds = [...new Set(latestViolations.map(v => v.userId))];
    const violationUsers = violationUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: violationUserIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userById = new Map(violationUsers.map(user => [user.id, user]));

    return res.status(200).json({
      stats: {
        totalExams,
        activeModules,
        activeStudents,
        pendingReviews,
        recentViolations,
        totalSubmissions,
        totalAttempts,
      },
      recentExams: recentExams.map(exam => ({
        id: exam.id,
        title: exam.title,
        subject: exam.subject || 'Unassigned',
        totalPoints: exam.totalPoints,
        durationMinutes: exam.durationMinutes,
        createdAt: exam.createdAt,
        submissionsCount: exam._count.submissions,
        attemptsCount: exam._count.attempts,
      })),
      latestViolations: latestViolations.map(violation => {
        const student = userById.get(violation.userId);
        return {
          id: violation.id,
          type: violation.type,
          timestamp: violation.timestamp,
          studentName: student?.name || 'Unknown student',
          studentEmail: student?.email || null,
        };
      }),
    });
  } catch (err) {
    console.error('Error fetching admin dashboard summary:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Get All Students ──────────────────────────────────────────────────────────
export const getStudents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        score: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ students });
  } catch (err) {
    console.error('Error fetching students:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Create Student ─────────────────────────────────────────────────────────────
export const createStudent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = createStudentSchema.parse(req.body);
    const { name, password, score } = validatedData;
    const email = normalizeEmail(validatedData.email);

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'STUDENT',
        score: score && score.trim() !== '' ? score : 'N/A',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        score: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: 'Student created successfully',
      student: user,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    console.error('Error creating student:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Update Student ─────────────────────────────────────────────────────────────
export const updateStudent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateStudentSchema.parse(req.body);
    const { name, password, score } = validatedData;
    const email = normalizeEmail(validatedData.email);

    // Verify student exists
    const existingStudent = await prisma.user.findFirst({
      where: { id, role: 'STUDENT' },
    });
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Check if email is in use by another user
    if (email !== normalizeEmail(existingStudent.email)) {
      const emailInUse = await findUserByEmail(email);
      if (emailInUse && emailInUse.id !== id) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }
    }

    // Prepare update data
    const updateData: any = { name, email };
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    if (score !== undefined) {
      updateData.score = score.trim() !== '' ? score : 'N/A';
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        score: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      message: 'Student updated successfully',
      student: updatedUser,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    console.error('Error updating student:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Delete Student ─────────────────────────────────────────────────────────────
export const deleteStudent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify student exists
    const existingStudent = await prisma.user.findFirst({
      where: { id, role: 'STUDENT' },
    });
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Error deleting student:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Get Single Student Exam Results ──────────────────────────────────────────
export const getStudentExamResults = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params; // student ID
    
    // Verify user is STUDENT
    const student = await prisma.user.findFirst({
      where: { id, role: 'STUDENT' },
    });
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Find all submissions
    const submissions = await prisma.examSubmission.findMany({
      where: { userId: id },
      include: {
        exam: {
          select: {
            title: true,
            subject: true,
            totalPoints: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Find all attempts
    const attempts = await prisma.examAttempt.findMany({
      where: { userId: id },
      include: {
        exam: {
          select: {
            title: true,
            subject: true,
            totalPoints: true,
          }
        },
        violations: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Combine into structured list
    const results = attempts.map(attempt => {
      const submission = submissions.find(s => s.examId === attempt.examId);
      
      return {
        examId: attempt.examId,
        examTitle: attempt.exam.title,
        subject: attempt.exam.subject || 'Unassigned',
        status: attempt.status,
        score: submission ? submission.score : (attempt.status === 'TERMINATED' ? 0 : null),
        totalPoints: attempt.exam.totalPoints,
        violationsCount: attempt.violations.length,
        violationsList: attempt.violations.map(v => ({
          type: v.type,
          timestamp: v.timestamp,
          metadata: v.metadata,
        })),
        dateAttempted: attempt.createdAt,
        dateSubmitted: submission ? submission.createdAt : (attempt.status === 'TERMINATED' ? attempt.updatedAt : null),
      };
    });

    // Submissions fallback
    submissions.forEach(sub => {
      if (!results.some(r => r.examId === sub.examId)) {
        results.push({
          examId: sub.examId,
          examTitle: sub.exam.title,
          subject: sub.exam.subject || 'Unassigned',
          status: 'SUBMITTED',
          score: sub.score,
          totalPoints: sub.totalPoints,
          violationsCount: 0,
          violationsList: [],
          dateAttempted: sub.createdAt,
          dateSubmitted: sub.createdAt,
        });
      }
    });

    return res.status(200).json({ 
      student: { id: student.id, name: student.name, email: student.email }, 
      results 
    });
  } catch (err) {
    console.error('Error fetching student exam results:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Get All Students Subject-wise Marks ──────────────────────────────────────
export const getAllStudentsSubjectScores = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Fetch all students
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        score: true,
      },
      orderBy: { name: 'asc' },
    });

    // Fetch all exams
    const exams = await prisma.exam.findMany({
      select: {
        id: true,
        subject: true,
      }
    });

    // Fetch all submissions
    const submissions = await prisma.examSubmission.findMany({
      select: {
        userId: true,
        examId: true,
        score: true,
        totalPoints: true,
      }
    });

    const SUBJECTS = [
      'Git and Github',
      'AI fundamentals',
      'Automation with N8N',
      'AI tools and Productivity'
    ];

    const studentSubjectMarks = students.map(student => {
      const studentSubmissions = submissions.filter(s => s.userId === student.id);
      
      const subjectMarks: Record<string, string> = {};
      
      SUBJECTS.forEach(subj => {
        // Find exams belonging to this subject
        const subjectExamIds = exams.filter(e => e.subject === subj).map(e => e.id);
        
        // Find submissions for those exams
        const subjSubmissions = studentSubmissions.filter(s => subjectExamIds.includes(s.examId));
        
        if (subjSubmissions.length === 0) {
          subjectMarks[subj] = 'N/A';
        } else {
          let earned = 0;
          let possible = 0;
          subjSubmissions.forEach(sub => {
            earned += sub.score;
            possible += sub.totalPoints;
          });
          const avg = possible > 0 ? Math.round((earned / possible) * 100) : 0;
          subjectMarks[subj] = `${avg}%`;
        }
      });

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        overallScore: student.score || 'N/A',
        subjectScores: subjectMarks,
      };
    });

    return res.status(200).json({
      subjects: SUBJECTS,
      studentMarks: studentSubjectMarks,
    });
  } catch (err) {
    console.error('Error fetching all students subject marks:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Get Submissions for Exam ────────────────────────────────────────────────
export const getExamSubmissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const exam = await prisma.exam.findUnique({
      where: { id },
    });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Fetch submissions WITHOUT include: { user } to avoid crashing when a student
    // account has been deleted (orphan submission). We use the denormalised
    // userName / userEmail fields that were written at submit-time instead.
    const rawSubmissions = await prisma.examSubmission.findMany({
      where: { examId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Optionally enrich from the live User table for students who still exist
    const userIds = [...new Set(rawSubmissions.map(s => s.userId))];
    const liveUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(liveUsers.map(u => [u.id, u]));

    const submissions = rawSubmissions.map(s => ({
      ...s,
      user: userMap.get(s.userId) ?? {
        id:    s.userId,
        name:  s.userName  ?? 'Deleted User',
        email: s.userEmail ?? 'unknown',
      },
    }));

    return res.status(200).json({ submissions });
  } catch (err) {
    console.error('Error fetching exam submissions:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// ─── Grade Subjective Exam Submission ─────────────────────────────────────────
export const gradeSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { answers } = req.body;
    
    const submission = await prisma.examSubmission.findUnique({
      where: { id: submissionId },
      include: { exam: true },
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    let newScore = 0;
    const updatedAnswers = submission.answers.map(originalAns => {
      const gradeInfo = answers?.find((a: any) => a.questionId === originalAns.questionId);
      const question = submission.exam.questions.find(q => q.id === originalAns.questionId);
      const maxPoints = question ? question.points : 0;
      
      const pointsEarned = gradeInfo ? Math.min(maxPoints, Math.max(0, Number(gradeInfo.pointsEarned || 0))) : (originalAns.pointsEarned ?? 0);
      const feedback = gradeInfo ? (gradeInfo.feedback || null) : (originalAns.feedback || null);
      newScore += pointsEarned;

      return {
        ...originalAns,
        pointsEarned,
        feedback,
      };
    });

    const updatedSubmission = await prisma.examSubmission.update({
      where: { id: submissionId },
      data: {
        answers: updatedAnswers,
        score: newScore,
        graded: true,
      },
    });

    // Recalculate student overall score
    const userId = submission.userId;
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

    return res.status(200).json({
      message: 'Submission graded successfully',
      submission: updatedSubmission,
    });
  } catch (err) {
    console.error('Error grading submission:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
