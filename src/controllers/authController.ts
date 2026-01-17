import { Request, Response } from "express";
import { createUser } from "./userController";
import User from "../models/userModel";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "1h",
  });
};

export const register = async (req: Request, res: Response) => {
  return createUser(req, res);
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(422)
        .json({ error: "username and password are required" });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const accessToken = generateToken(user._id.toString());
    res.json({ accessToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
