import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, UserRole } from "../../types";
import { prisma } from "../../db";
import { formatUserFromDb } from "../lib/utils";
import { JWT_SECRET } from "../lib/config";
import { AppError } from "./error.middleware";

export interface JwtPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export function signJwt(userId: string, role: UserRole): string {
  const hours = parseInt(process.env.JWT_TTL_HOURS || "24", 10);
  return jwt.sign({ sub: userId, role } as JwtPayload, JWT_SECRET, {
    expiresIn: `${hours}h`
  });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: "Authentication required. Provide a Bearer token." });
      return;
    }
    const payload = verifyJwt(token);
    if (!payload?.sub) {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }
    const dbUser = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!dbUser) {
      res.status(401).json({ error: "User no longer exists." });
      return;
    }
    (req as any).user = formatUserFromDb(dbUser);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as User | undefined;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}`
      });
      return;
    }
    next();
  };
}

/** Optional auth: attach user if token present, never reject */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    const payload = verifyJwt(token);
    if (payload?.sub) {
      (req as any).user = { id: payload.sub };
    }
  }
  next();
}
