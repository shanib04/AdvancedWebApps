import { Router } from "express";
import * as controller from "../controllers/userController";
import authMiddleware from "../middleware/authMiddleware";

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API for managing users
 */
const router = Router();

/**
 * @swagger
 * /user:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *                 description: The username for the new user
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email for the new user
 *               password:
 *                 type: string
 *                 description: The password for the new user
 *     responses:
 *       201:
 *         description: User created successfully
 *       409:
 *         description: Username or email already exists
 *       422:
 *         description: Validation error
 */
router.post("/", authMiddleware, controller.createUser);

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get("/", authMiddleware, controller.getAllUsers);

/**
 * @swagger
 * /user/whoami:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 */
router.get("/whoami", authMiddleware, controller.getCurrentUser);

/**
 * @swagger
 * /user/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get("/:id", authMiddleware, controller.getUserById);

/**
 * @swagger
 * /user/{id}:
 *   put:
 *     summary: Update a user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
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
 *                 description: The updated username
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The updated email
 *               password:
 *                 type: string
 *                 description: The updated password
 *     responses:
 *       200:
 *         description: User updated successfully
 *       422:
 *         description: Validation error
 *       404:
 *         description: User not found
 */
router.put("/:id", authMiddleware, controller.updateUser);

/**
 * @swagger
 * /user/{id}:
 *   delete:
 *     summary: Delete a user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete("/:id", authMiddleware, controller.deleteUser);

export default router;
