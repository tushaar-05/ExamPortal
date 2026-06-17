import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { sendTokenCookies, clearTokenCookies } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import { findUserByEmail, normalizeEmail } from '../utils/email';

// ─── Validation Schemas ───────────────────────────────────────────────────────

// Public registration is STUDENT-only; role is NOT accepted from the client
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// ─── Seed Admin User ──────────────────────────────────────────────────────────

/**
 * Called once on server startup.
 * Creates the predefined admin account from .env if it doesn't already exist.
 */
export const initAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL ? normalizeEmail(process.env.ADMIN_EMAIL) : undefined;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Portal Admin';

  if (!adminEmail || !adminPassword) {
    console.warn('Admin account seeding skipped: ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    return;
  }

  try {
    const existing = await findUserByEmail(adminEmail);
    if (!existing) {
      const salt   = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(adminPassword, salt);
      await prisma.user.create({
        data: { email: adminEmail, name: adminName, password: hashed, role: 'ADMIN' },
      });
      console.log(`✅ Admin account seeded → ${adminEmail}`);
    } else {
      console.log(`ℹ️  Admin account already exists → ${adminEmail}`);
    }
  } catch (err) {
    console.error('❌ Failed to seed admin account:', err);
  }
};

// ─── Controllers ──────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { name, password } = validatedData;
    const email = normalizeEmail(validatedData.email);

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // All public registrations are STUDENT
    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword, role: 'STUDENT' },
    });

    // Auto-login on registration
    sendTokenCookies(res, user.id, user.role);

    return res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, email: user.email, name: user.name, role: user.role, profilePic: user.profilePic ?? null },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { password } = validatedData;
    const email = normalizeEmail(validatedData.email);

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    sendTokenCookies(res, user.id, user.role);

    return res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name, role: user.role, profilePic: user.profilePic ?? null },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    clearTokenCookies(res);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const me = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, profilePic: user.profilePic ?? null },
    });
  } catch (err: any) {
    // P2023 = malformed ObjectId (e.g. stale UUID token from a previous DB era)
    if (err?.code === 'P2023') {
      return res.status(401).json({ message: 'Session invalid. Please log in again.' });
    }
    console.error('Get profile error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors.map((e) => e.message) });
    }
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
