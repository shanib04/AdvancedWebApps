import { Request, Response } from "express";
import User from "../models/userModel";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { AuthRequest } from "../middleware/authMiddleware";
import { getErrorMessage } from "../utils/getErrorMessage";

export const createUser = async (req: Request, res: Response) => {
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
    res.status(201).json(user);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(422).json({ error: "User ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(422).json({ error: "User ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }

    if (!req.user || req.user._id !== id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { username, email, password, photoUrl } = req.body as {
      username?: string;
      email?: string;
      password?: string;
      photoUrl?: string;
    };

    const updates: {
      username?: string;
      email?: string;
      password?: string;
      photoUrl?: string;
    } = {};

    if (typeof username === "string" && username.trim()) {
      updates.username = username.trim();
    }

    if (typeof email === "string" && email.trim()) {
      updates.email = email.trim();
    }

    if (typeof password === "string" && password.trim()) {
      updates.password = await bcrypt.hash(password, 10);
    }

    if (typeof photoUrl === "string") {
      updates.photoUrl = photoUrl.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(422).json({ error: "No valid fields to update" });
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(422).json({ error: "User ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};
