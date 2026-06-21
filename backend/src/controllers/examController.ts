import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const optionSchema = z.object({
  id: z.string().min(1, 'Option ID is required'),
  text: z.string().min(1, 'Option text is required'),
  imageUrl: z.string().nullable().optional(),
});

const questionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  text: z.string().min(1, 'Question text is required'),
  imageUrl: z.string().nullable().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  points: z.number().min(0, 'Question points must be non-negative'),
  type: z.enum(['MCQ', 'SUBJECTIVE']).nullable().optional(),
  options: z.array(optionSchema).optional().nullable(),
  correctOptionId: z.string().nullable().optional(),
  correctSubjectiveAnswer: z.string().nullable().optional(),
  correctAnswerKeywords: z.string().nullable().optional(),
}).refine((data) => {
  const qType = data.type || 'MCQ';
  if (qType === 'MCQ') {
    return (data.options && data.options.length >= 2) && (data.correctOptionId && data.correctOptionId.trim() !== '');
  }
  return true;
}, {
  message: 'MCQ questions require at least 2 options and a correct option choice.',
  path: ['options']
});

const createExamSchema = z.object({
  title: z.string().min(1, 'Exam title is required'),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
  totalPoints: z.number().min(1, 'Total points must be at least 1').default(100),
  startTime: z.string().datetime({ offset: true }).nullable().optional(),
  endTime: z.string().datetime({ offset: true }).nullable().optional(),
  subject: z.string().nullable().optional(),
  type: z.enum(['MCQ', 'SUBJECTIVE']).nullable().optional(),
});

const updateExamSchema = z.object({
  title: z.string().min(1, 'Exam title is required'),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
  totalPoints: z.number().min(1, 'Total points must be at least 1'),
  startTime: z.string().datetime({ offset: true }).nullable().optional(),
  endTime: z.string().datetime({ offset: true }).nullable().optional(),
  subject: z.string().nullable().optional(),
  type: z.enum(['MCQ', 'SUBJECTIVE']).nullable().optional(),
  questions: z.array(questionSchema).optional(),
});

// ─── CRUD Controllers ─────────────────────────────────────────────────────────

// 1. Get all exams (brief outline for listing table)
export const getExams = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exams = await prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Format list view to include questions count
    const formattedExams = exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      totalPoints: exam.totalPoints,
      startTime: exam.startTime,
      endTime: exam.endTime,
      subject: exam.subject,
      type: exam.type || 'MCQ',
      questionsCount: exam.questions.length,
      createdAt: exam.createdAt,
    }));

    return res.status(200).json({ exams: formattedExams });
  } catch (err) {
    console.error('Error fetching exams:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 2. Get a single exam detail (with all questions/options)
export const getExamById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    return res.status(200).json({ exam });
  } catch (err) {
    console.error('Error fetching exam by ID:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 3. Create exam outline (creates an exam with 0 questions)
export const createExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = createExamSchema.parse(req.body);
    const { title, description, durationMinutes, totalPoints, startTime, endTime, subject, type } = validatedData;

    const exam = await prisma.exam.create({
      data: {
        title,
        description: description || '',
        durationMinutes,
        totalPoints,
        type: type || 'MCQ',
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        subject: subject || null,
        questions: [],
      },
    });

    return res.status(201).json({
      message: 'Exam created successfully',
      exam,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    console.error('Error creating exam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 4. Update exam details and/or questions
export const updateExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateExamSchema.parse(req.body);
    const { title, description, durationMinutes, totalPoints, startTime, endTime, subject, questions, type } = validatedData;

    // Check if exam exists
    const existingExam = await prisma.exam.findUnique({ where: { id } });
    if (!existingExam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Prepare update payload
    const updateData: any = {
      title,
      description: description || '',
      durationMinutes,
      totalPoints,
      type: type !== undefined ? (type || 'MCQ') : undefined,
      startTime: startTime !== undefined ? (startTime ? new Date(startTime) : null) : undefined,
      endTime: endTime !== undefined ? (endTime ? new Date(endTime) : null) : undefined,
      subject: subject !== undefined ? (subject || null) : undefined,
    };

    if (questions !== undefined) {
      updateData.questions = questions;
    }

    const updatedExam = await prisma.exam.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      message: 'Exam updated successfully',
      exam: updatedExam,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    console.error('Error updating exam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 5. Delete exam
export const deleteExam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if exam exists
    const existingExam = await prisma.exam.findUnique({ where: { id } });
    if (!existingExam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    await prisma.exam.delete({ where: { id } });

    return res.status(200).json({ message: 'Exam deleted successfully' });
  } catch (err) {
    console.error('Error deleting exam:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
