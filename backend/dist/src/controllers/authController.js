"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refresh = exports.googleSignin = exports.login = exports.register = void 0;
const userModel_1 = __importDefault(require("../models/userModel"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const getDefaultPhotoUrl = (req) => `${req.protocol}://${req.get("host")}/public/images/default-user.svg`;
const resolveUserPhotoUrl = (req, photoUrl) => photoUrl || getDefaultPhotoUrl(req);
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const normalizeUsername = (value) => {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    return normalized || "user";
};
const getUniqueUsername = async (preferredValue) => {
    const baseUsername = normalizeUsername(preferredValue);
    let candidate = baseUsername;
    let suffix = 1;
    while (await userModel_1.default.findOne({ username: candidate })) {
        candidate = `${baseUsername}_${suffix}`;
        suffix += 1;
    }
    return candidate;
};
const generateToken = (userId) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    const exp = parseInt(process.env.JWT_EXPIRES_IN || "3600");
    const refreshExp = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || "86400");
    const accessToken = jsonwebtoken_1.default.sign({ userId }, secret, { expiresIn: exp });
    const refreshToken = jsonwebtoken_1.default.sign({ userId }, secret, { expiresIn: refreshExp });
    return { token: accessToken, accessToken, refreshToken };
};
const register = async (req, res) => {
    try {
        const { username, email, password, photoUrl } = req.body;
        if (!username || !email || !password) {
            return res
                .status(422)
                .json({ error: "username, email and password are required" });
        }
        const existingUser = await userModel_1.default.findOne({
            $or: username ? [{ username }, { email }] : [{ email }],
        });
        if (existingUser) {
            const errorMsg = username && existingUser.username === username
                ? "Username already exists"
                : "Email already exists";
            return res.status(409).json({ error: errorMsg });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const resolvedPhotoUrl = resolveUserPhotoUrl(req, photoUrl);
        const user = await userModel_1.default.create({
            username,
            email,
            password: hashedPassword,
            photoUrl: resolvedPhotoUrl,
            refresh_tokens: [],
            refreshToken: [],
        });
        const tokens = generateToken(user._id.toString());
        user.refresh_tokens.push(tokens.refreshToken);
        user.refreshToken = user.refresh_tokens;
        await user.save();
        res.status(201).json({
            ...tokens,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                photoUrl: resolveUserPhotoUrl(req, user.photoUrl),
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if ((!username && !email) || !password) {
            return res
                .status(422)
                .json({ error: "email and password are required" });
        }
        const user = await userModel_1.default.findOne(email ? { email } : { username });
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
        const tokens = generateToken(user._id.toString());
        user.refresh_tokens.push(tokens.refreshToken);
        user.refreshToken = user.refresh_tokens;
        await user.save();
        res.json({
            ...tokens,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                photoUrl: resolveUserPhotoUrl(req, user.photoUrl),
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.login = login;
const googleSignin = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(422).json({ error: "Google credential is required" });
        }
        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({ error: "GOOGLE_CLIENT_ID is not configured" });
        }
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.email) {
            return res.status(401).json({ error: "Invalid Google token payload" });
        }
        const { email, picture, name } = payload;
        const googlePhotoUrl = resolveUserPhotoUrl(req, picture);
        const preferredUsername = name || email.split("@")[0];
        let user = await userModel_1.default.findOne({ email });
        if (!user) {
            const generatedPassword = await bcrypt_1.default.hash(`google-${Date.now()}`, 10);
            const uniqueUsername = await getUniqueUsername(preferredUsername);
            user = await userModel_1.default.create({
                username: uniqueUsername,
                email,
                password: generatedPassword,
                photoUrl: googlePhotoUrl,
                refresh_tokens: [],
                refreshToken: [],
            });
        }
        else {
            user.photoUrl = googlePhotoUrl;
            if (!user.username) {
                user.username = await getUniqueUsername(preferredUsername);
            }
        }
        const tokens = generateToken(user._id.toString());
        user.refresh_tokens.push(tokens.refreshToken);
        user.refreshToken = user.refresh_tokens;
        await user.save();
        return res.status(200).json({
            ...tokens,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                photoUrl: resolveUserPhotoUrl(req, user.photoUrl),
            },
        });
    }
    catch (error) {
        return res.status(401).json({ error: "Google sign-in failed" });
    }
};
exports.googleSignin = googleSignin;
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ error: "Refresh token is required" });
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ error: "JWT_SECRET is not configured" });
        }
        const decoded = jsonwebtoken_1.default.verify(refreshToken, secret);
        const user = await userModel_1.default.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!user.refresh_tokens.includes(refreshToken)) {
            user.refresh_tokens = [];
            user.refreshToken = [];
            await user.save();
            return res.status(401).json({ error: "Unauthorized" });
        }
        const tokens = generateToken(user._id.toString());
        user.refresh_tokens.push(tokens.refreshToken);
        user.refresh_tokens = user.refresh_tokens.filter((rt) => rt !== refreshToken);
        user.refreshToken = user.refresh_tokens;
        await user.save();
        res.json(tokens);
    }
    catch (error) {
        res.status(401).json({ error: "Unauthorized" });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(422).json({ error: "Refresh token is required" });
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ error: "JWT_SECRET is not configured" });
        }
        const decoded = jsonwebtoken_1.default.verify(refreshToken, secret);
        const user = await userModel_1.default.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        user.refresh_tokens = user.refresh_tokens.filter((rt) => rt !== refreshToken);
        user.refreshToken = user.refresh_tokens;
        await user.save();
        res.json({ message: "Logged out successfully" });
    }
    catch (error) {
        res.status(401).json({ error: "Unauthorized" });
    }
};
exports.logout = logout;
