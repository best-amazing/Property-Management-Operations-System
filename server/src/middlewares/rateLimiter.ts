import { Request, Response, NextFunction } from "express";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function createLimiter(windowMs: number, max: number, keyFor: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();

    if (buckets.size > 10000) pruneExpired(now);

    const key = `${req.ip}:${keyFor(req)}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.status(429).json({ error: "Too many requests, please try again later." });
      return;
    }

    next();
  };
}

export const otpSendLimiter = createLimiter(15 * 60 * 1000, 5, req => `send:${req.body?.username ?? ""}`);

export const otpVerifyLimiter = createLimiter(5 * 60 * 1000, 5, req => `verify:${req.body?.loginSessionToken ?? ""}`);
