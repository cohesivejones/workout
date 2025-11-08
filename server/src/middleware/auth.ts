import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../entities";
import dataSource from "../data-source";

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// JWT secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Generate JWT token
export const generateToken = (user: User): string => {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "2h",
  });
};

// Verify JWT token middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get token from cookies only (no bearer token support)
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

    // Get user from database
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Optional authentication middleware - doesn't require authentication but attaches user if token is valid
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get token from cookies only (no bearer token support)
    const token = req.cookies?.token;

    if (!token) {
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

    // Get user from database
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (user) {
      // Attach user to request object
      req.user = user;
    }

    next();
  } catch {
    // Continue without authentication if token is invalid
    next();
  }
};
