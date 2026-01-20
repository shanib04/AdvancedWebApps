import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthRequest = Request & { user: { _id: string } };

const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  const secret: string = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "JWT_SECRET is not configured" });
  }

  try {
    const decoded = jwt.verify(token, secret) as {
      userId: string;
    };
    req.user = { _id: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export default authMiddleware;
