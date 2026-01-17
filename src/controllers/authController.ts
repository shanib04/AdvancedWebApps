import { Request, Response } from "express";
import User from "../models/userModel";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export interface Tokens {
  token: string;
  refreshToken: string;
}

const generateToken = (userId: string): Tokens => {
  const secret: string = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  const exp: number = parseInt(process.env.JWT_EXPIRES_IN || "1h");
  const refreshExp: number = parseInt(
    process.env.JWT_REFRESH_EXPIRES_IN || "24h"
  );

  const token = jwt.sign({ userId }, secret, { expiresIn: exp });
  const refreshToken = jwt.sign({ userId }, secret, { expiresIn: refreshExp });

  return { token, refreshToken };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res
        .status(422)
        .json({ error: "username, email and password are required" });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      const errorMsg =
        existingUser.username === username
          ? "Username already exists"
          : "Email already exists";
      return res.status(409).json({ error: errorMsg });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const tokens = generateToken(user._id.toString());
    user.refreshToken.push(tokens.refreshToken);
    await user.save();

    res.status(201).json(tokens);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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

    const tokens = generateToken(user._id.toString());
    user.refreshToken.push(tokens.refreshToken);
    await user.save();

    res.json(tokens);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token is required" });
    }

    const secret: string = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT_SECRET is not configured" });
    }
    const decoded: any = jwt.verify(refreshToken, secret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.refreshToken.includes(refreshToken)) {
      user.refreshToken = [];
      await user.save();
      return res.status(401).json({ error: "Unauthorized" });
    }

    const tokens = generateToken(user._id.toString());
    user.refreshToken.push(tokens.refreshToken);
    user.refreshToken = user.refreshToken.filter((rt) => rt !== refreshToken);
    await user.save();

    res.json(tokens);
  } catch (error: any) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(422).json({ error: "Refresh token is required" });
    }

    const secret: string = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT_SECRET is not configured" });
    }
    const decoded: any = jwt.verify(refreshToken, secret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    user.refreshToken = user.refreshToken.filter((rt) => rt !== refreshToken);
    await user.save();

    res.json({ message: "Logged out successfully" });
  } catch (error: any) {
    res.status(401).json({ error: "Unauthorized" });
  }
};
