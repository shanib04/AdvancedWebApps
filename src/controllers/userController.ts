import { Request, Response } from "express";
import User from "../models/userModel";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { AuthRequest } from "../middleware/authMiddleware";

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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body;
    if (!id || !username || !email || !password) {
      return res.status(422).json({
        error: "User ID, username, email and password are required",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }
    const user = await User.findByIdAndUpdate(id, req.body, { new: true });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
