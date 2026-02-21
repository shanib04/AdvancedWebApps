import { Request, Response } from "express";
import User from "../models/userModel";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

export interface Tokens {
  token: string;
  refreshToken: string;
}

const getDefaultPhotoUrl = (req: Request) =>
  `${req.protocol}://${req.get("host")}/public/images/default-user.svg`;

const resolveUserPhotoUrl = (req: Request, photoUrl?: string) =>
  photoUrl || getDefaultPhotoUrl(req);

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Escapes special regex characters in a string to safely use it for literal text matching in queries.
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeUsername = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized || "User";
};

// Cleans up the requested name and appends an incrementing number until it finds a username that is completely unique in the database.
const getUniqueUsername = async (preferredValue: string) => {
  const baseUsername = normalizeUsername(preferredValue);
  let candidate = baseUsername;
  let suffix = 1;

  while (
    await User.findOne({
      username: new RegExp(`^${escapeRegex(candidate)}$`, "i"),
    })
  ) {
    candidate = `${baseUsername} ${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const generateToken = (userId: string): Tokens => {
  const secret: string = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  const exp: number = parseInt(process.env.JWT_EXPIRES_IN || "3600");
  const refreshExp: number = parseInt(
    process.env.JWT_REFRESH_EXPIRES_IN || "86400",
  );

  const token = jwt.sign({ userId }, secret, { expiresIn: exp });
  const refreshToken = jwt.sign({ userId }, secret, { expiresIn: refreshExp });

  return { token, refreshToken };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, photoUrl } = req.body;
    if (!username || !email || !password) {
      return res
        .status(422)
        .json({ error: "username, email and password are required" });
    }

    const normalizedUsername = normalizeUsername(username);

    const existingUser = await User.findOne({
      $or: [
        { username: new RegExp(`^${escapeRegex(normalizedUsername)}$`, "i") },
        { email },
      ],
    });
    if (existingUser) {
      const errorMsg =
        existingUser.username.toLowerCase() === normalizedUsername.toLowerCase()
          ? "Username already exists"
          : "Email already exists";
      return res.status(409).json({ error: errorMsg });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const resolvedPhotoUrl = resolveUserPhotoUrl(req, photoUrl);
    const user = await User.create({
      username: normalizedUsername,
      email,
      password: hashedPassword,
      photoUrl: resolvedPhotoUrl,
      refreshToken: [],
    });

    const tokens = generateToken(user._id.toString());
    user.refreshToken.push(tokens.refreshToken);
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if ((!username && !email) || !password) {
      return res.status(422).json({ error: "email and password are required" });
    }

    const normalizedUsername = username
      ? normalizeUsername(username)
      : undefined;

    const user = await User.findOne(
      email
        ? { email }
        : {
            username: new RegExp(
              `^${escapeRegex(normalizedUsername || "")}$`,
              "i",
            ),
          },
    );
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

    res.json({
      ...tokens,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        photoUrl: resolveUserPhotoUrl(req, user.photoUrl),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const googleSignin = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(422).json({ error: "Google credential is required" });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res
        .status(500)
        .json({ error: "GOOGLE_CLIENT_ID is not configured" });
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

    let user = await User.findOne({ email });
    if (!user) {
      const generatedPassword = await bcrypt.hash(`google-${Date.now()}`, 10);
      const uniqueUsername = await getUniqueUsername(preferredUsername);
      user = await User.create({
        username: uniqueUsername,
        email,
        password: generatedPassword,
        photoUrl: googlePhotoUrl,
        refreshToken: [],
      });
    } else {
      user.photoUrl = googlePhotoUrl;
      if (!user.username) {
        user.username = await getUniqueUsername(preferredUsername);
      }
    }

    const tokens = generateToken(user._id.toString());
    user.refreshToken.push(tokens.refreshToken);
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
  } catch (error: any) {
    return res.status(401).json({ error: "Google sign-in failed" });
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
