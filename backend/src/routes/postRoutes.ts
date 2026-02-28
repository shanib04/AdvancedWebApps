import { Router } from "express";
import * as controller from "../controllers/postController";
import authMiddleware from "../middleware/authMiddleware";

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: API for managing posts
 */

const router = Router();

/**
 * @swagger
 * /post:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The content of the post
 *     responses:
 *       201:
 *         description: Post created successfully
 *       422:
 *         description: Validation error
 */
router.post("/", authMiddleware, controller.createPost);

/**
 * @swagger
 * /post:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: user
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter posts by creator user ID
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for paginated results
 *     responses:
 *       200:
 *         description: List of posts
 *       422:
 *         description: Invalid User ID format
 */
router.get("/", authMiddleware, controller.getAllPosts);

/**
 * @swagger
 * /post/user/{userId}/liked:
 *   get:
 *     summary: Get posts liked by a specific user
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID whose liked posts should be returned
 *     responses:
 *       200:
 *         description: List of liked posts
 *       422:
 *         description: Invalid User ID format
 */
router.get("/user/:userId/liked", authMiddleware, controller.getLikedPosts);

/**
 * @swagger
 * /post/user/{userId}/saved:
 *   get:
 *     summary: Get posts saved by a specific user
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID whose saved posts should be returned
 *     responses:
 *       200:
 *         description: List of saved posts
 *       422:
 *         description: Invalid User ID format
 */
router.get("/user/:userId/saved", authMiddleware, controller.getSavedPosts);

/**
 * @swagger
 * /post/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post
 *     responses:
 *       200:
 *         description: Post details
 *       404:
 *         description: Post not found
 */
router.get("/:id", authMiddleware, controller.getPostById);

/**
 * @swagger
 * /post/{id}:
 *   put:
 *     summary: Update a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The updated content of the post
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       404:
 *         description: Post not found
 */
router.put("/:id", authMiddleware, controller.updatePost);

/**
 * @swagger
 * /post/{id}/like:
 *   post:
 *     summary: Toggle like/unlike for a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post
 *     responses:
 *       200:
 *         description: Post like state toggled successfully
 *       404:
 *         description: Post not found
 */
router.post("/:id/like", authMiddleware, controller.toggleLike);

/**
 * @swagger
 * /post/{id}/save:
 *   post:
 *     summary: Toggle save/unsave for a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post
 *     responses:
 *       200:
 *         description: Post save state toggled successfully
 *       404:
 *         description: Post not found
 */
router.post("/:id/save", authMiddleware, controller.toggleSave);

/**
 * @swagger
 * /post/{id}:
 *   delete:
 *     summary: Delete a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       404:
 *         description: Post not found
 */
router.delete("/:id", authMiddleware, controller.deletePost);

export default router;
