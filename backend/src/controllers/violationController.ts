import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const logViolation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { attemptId, type, timestamp, metadata } = req.body;

    if (!attemptId || !type) {
      return res.status(400).json({ message: 'Missing attemptId or violation type.' });
    }

    // Find the attempt
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Exam attempt not found.' });
    }

    if (attempt.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden: Attempt does not belong to you.' });
    }

    if (attempt.status !== 'STARTED') {
      return res.status(400).json({ message: 'This exam session is not active.' });
    }

    // Create the Violation — include denormalised user identity
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    await prisma.violation.create({
      data: {
        attemptId,
        userId,
        userName:  user?.name  ?? undefined,
        userEmail: user?.email ?? undefined,
        type,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        metadata: metadata ? String(metadata) : undefined
      }
    });

    // Deduct chance
    const newRemainingChances = Math.max(0, attempt.remainingChances - 1);

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        remainingChances: newRemainingChances,
        status: newRemainingChances === 0 ? 'TERMINATED' : 'STARTED'
      }
    });

    return res.status(200).json({
      message: 'Violation logged successfully.',
      remainingChances: updatedAttempt.remainingChances
    });

  } catch (err) {
    console.error('Error logging violation:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
