import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { User } from "../../types";

export const aiAnalyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => {
    const user = (req as any).user as User | undefined;
    return user ? `user:${user.id}` : ipKeyGenerator(req.ip || "unknown");
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many AI analysis requests. Please wait a moment and try again."
    });
  },
  skip: () => false
});
