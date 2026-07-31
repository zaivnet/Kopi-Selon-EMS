import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      return res.status(401).json({ message: 'Unauthorized: Invalid token', code: 'TOKEN_EXPIRED' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          include: { permissions: true }
        }
      },
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const permissions = Array.isArray(user.role?.permissions)
      ? user.role.permissions.map(p => p.permissionId)
      : [];

    req.user = {
      ...user,
      permissions
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Session expired or invalid token. Please login again.', code: 'TOKEN_EXPIRED' });
    }
    console.error('Authentication Middleware Error:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || (!roles.includes(req.user.role.name) && req.user.role.name !== 'Administrator')) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

export const authorizePermission = (...permissionKeys: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Administrator has all permissions
    if (req.user.role?.name === 'Administrator') {
      return next();
    }

    if (Array.isArray(req.user.permissions)) {
      const hasPermission = permissionKeys.some(key => req.user.permissions.includes(key));
      if (hasPermission) {
        return next();
      }
    }

    return res.status(403).json({ 
      message: `Forbidden: Anda tidak memiliki hak akses yang diperlukan` 
    });
  };
};
