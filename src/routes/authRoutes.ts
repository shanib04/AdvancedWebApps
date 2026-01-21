import { Router } from "express";
import * as controller from "../controllers/authController";

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API for authentication
 */
const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username for the new account
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email for the new account
 *               password:
 *                 type: string
 *                 description: The password for the new account
 *     responses:
 *       201:
 *         description: User registered successfully, returns access and refresh tokens
 *       409:
 *         description: Username or email already exists
 *       422:
 *         description: Validation error
 */
router.post("/register", controller.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with username and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username
 *               password:
 *                 type: string
 *                 description: The password
 *     responses:
 *       200:
 *         description: Login successful, returns access and refresh tokens
 *       422:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", controller.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh the access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token
 *     responses:
 *       200:
 *         description: New access token generated
 *       401:
 *         description: Invalid or unauthorized refresh token
 */
router.post("/refresh", controller.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate the refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token to invalidate
 *     responses:
 *       200:
 *         description: Logout successful
 *       422:
 *         description: Validation error
 *       401:
 *         description: Invalid or unauthorized refresh token
 */
router.post("/logout", controller.logout);

export default router;
