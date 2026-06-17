import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

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
    const { name, email, password, score } = validatedData;

    const existingUser = await prisma.user.findUnique({ where: { email } });
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
    const { name, email, password, score } = validatedData;

    // Verify student exists
    const existingStudent = await prisma.user.findFirst({
      where: { id, role: 'STUDENT' },
    });
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Check if email is in use by another user
    if (email !== existingStudent.email) {
      const emailInUse = await prisma.user.findUnique({ where: { email } });
      if (emailInUse) {
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
