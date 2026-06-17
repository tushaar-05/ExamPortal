import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken, sendTokenCookies, TokenPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { accessToken, refreshToken } = req.cookies;

  if (!accessToken) {
    if (!refreshToken) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const decodedRefresh = verifyRefreshToken(refreshToken);
      // Issue new access and refresh tokens (sliding window)
      sendTokenCookies(res, decodedRefresh.userId, decodedRefresh.role);
      req.user = { userId: decodedRefresh.userId, role: decodedRefresh.role };
      return next();
    } catch (refreshErr) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
  }

  try {
    const decoded = verifyAccessToken(accessToken);
    req.user = decoded;
    return next();
  } catch (err: any) {
    // Access token expired, attempt to use refresh token
    if (err.name === 'TokenExpiredError' && refreshToken) {
      try {
        const decodedRefresh = verifyRefreshToken(refreshToken);
        sendTokenCookies(res, decodedRefresh.userId, decodedRefresh.role);
        req.user = { userId: decodedRefresh.userId, role: decodedRefresh.role };
        return next();
      } catch (refreshErr) {
        return res.status(401).json({ message: 'Session expired. Please log in again.' });
      }
    }
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};
