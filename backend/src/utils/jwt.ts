import jwt from 'jsonwebtoken';
import { Response } from 'express';

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable is required.`);
  }
  return value;
};

export interface TokenPayload {
  userId: string;
  role: string;
}

export const generateAccessToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, getRequiredEnv('JWT_SECRET'), { expiresIn: '1d' });
};

export const generateRefreshToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, getRequiredEnv('JWT_REFRESH_SECRET'), { expiresIn: '365d' });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, getRequiredEnv('JWT_SECRET')) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, getRequiredEnv('JWT_REFRESH_SECRET')) as TokenPayload;
};

export const sendTokenCookies = (res: Response, userId: string, role: string) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId, role);

  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'none' : 'lax';

  // Access token cookie (expires in 1 day)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: 24 * 60 * 60 * 1000, // 1 day in ms
  });

  // Refresh token cookie (expires in 365 days)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days in ms
  });

  return { accessToken, refreshToken };
};

export const clearTokenCookies = (res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'none' : 'lax';
  
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite,
  });
  
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite,
  });
};
