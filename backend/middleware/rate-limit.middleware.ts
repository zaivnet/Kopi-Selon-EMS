import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipStore = new Map<string, RateLimitRecord>();

/**
 * Lightweight in-memory rate limiter middleware.
 * @param maxRequests Maximum allowed requests within the time window
 * @param windowMs Time window in milliseconds (default: 15 minutes)
 */
export const createRateLimiter = (maxRequests = 10, windowMs = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    const record = ipStore.get(ip);
    if (!record || now > record.resetTime) {
      ipStore.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        message: `Terlalu banyak percobaan request/login dari IP Anda. Silakan coba lagi dalam ${Math.ceil(retryAfterSeconds / 60)} menit.`
      });
    }

    record.count++;
    next();
  };
};

export const loginRateLimiter = createRateLimiter(10, 15 * 60 * 1000); // 10 attempts per 15 mins
