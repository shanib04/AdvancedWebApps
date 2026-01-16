import { Request, Response } from "express";
import User from "../models/userModel";
import mongoose from "mongoose";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res
        .status(422)
        .json({ error: "username, email and password are required" });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Username already exists" });
    }
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
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
    const user = await User.findById(id);
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
