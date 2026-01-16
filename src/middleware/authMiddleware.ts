import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { User } from "../models/userModel";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    req.user = {
      _id: new mongoose.Types.ObjectId(decoded.id),
    } as User;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
