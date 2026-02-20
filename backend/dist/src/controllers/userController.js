"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getCurrentUser = exports.getUserById = exports.getAllUsers = exports.createUser = void 0;
const userModel_1 = __importDefault(require("../models/userModel"));
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const createUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res
                .status(422)
                .json({ error: "username, email and password are required" });
        }
        const existingUser = await userModel_1.default.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            const errorMsg = existingUser.username === username
                ? "Username already exists"
                : "Email already exists";
            return res.status(409).json({ error: errorMsg });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await userModel_1.default.create({
            username,
            email,
            password: hashedPassword,
        });
        res.status(201).json(user);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.createUser = createUser;
const getAllUsers = async (req, res) => {
    try {
        const users = await userModel_1.default.find().select("-password");
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(422).json({ error: "User ID is required" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(422).json({ error: "Invalid User ID format" });
        }
        const user = await userModel_1.default.findById(id).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getUserById = getUserById;
const getCurrentUser = async (req, res) => {
    try {
        const user = await userModel_1.default.findById(req.user?._id).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCurrentUser = getCurrentUser;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password } = req.body;
        if (!id || !username || !email || !password) {
            return res.status(422).json({
                error: "User ID, username, email and password are required",
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(422).json({ error: "Invalid User ID format" });
        }
        const user = await userModel_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(422).json({ error: "User ID is required" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(422).json({ error: "Invalid User ID format" });
        }
        const user = await userModel_1.default.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteUser = deleteUser;
