import { Router } from "express";
import {
  generateInitialDraft,
  getMoreImages,
  refineText,
} from "../controllers/aiController";
import authMiddleware from "../middleware/authMiddleware";

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-assisted drafting and image lookup endpoints
 */
const router = Router();

/**
 * @swagger
 * /api/ai/generateInitialDraft:
 *   post:
 *     summary: Generate an initial post draft and optional images
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: Write a short post about React hooks
 *               includeImages:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Draft generated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         description: AI provider or server error
 */
router.post("/generateInitialDraft", authMiddleware, generateInitialDraft);

/**
 * @swagger
 * /api/ai/refineText:
 *   post:
 *     summary: Refine existing text with an instruction
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentText
 *               - instruction
 *             properties:
 *               currentText:
 *                 type: string
 *                 example: This is a long draft that should be shortened.
 *               instruction:
 *                 type: string
 *                 example: Make it concise and friendly.
 *     responses:
 *       200:
 *         description: Refined text returned
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         description: AI provider or server error
 */
router.post("/refineText", authMiddleware, refineText);

/**
 * @swagger
 * /api/ai/getMoreImages:
 *   post:
 *     summary: Fetch additional images for a keyword
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keyword
 *             properties:
 *               keyword:
 *                 type: string
 *                 example: nature
 *     responses:
 *       200:
 *         description: Image list returned
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         description: Unsplash or server error
 */
router.post("/getMoreImages", authMiddleware, getMoreImages);

export default router;
