import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const submitFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { examId, rating, message } = req.body;

    if (!examId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Invalid feedback payload. Rating must be between 1 and 5.' });
    }

    // Include denormalised user identity on the feedback record
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    await prisma.feedback.create({
      data: {
        examId,
        userId,
        userName:  user?.name  ?? undefined,
        userEmail: user?.email ?? undefined,
        rating,
        message: message ? String(message) : undefined,
      },
    });

    return res.status(200).json({ success: true, message: 'Feedback submitted successfully.' });

  } catch (err) {
    console.error('Error submitting feedback:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
