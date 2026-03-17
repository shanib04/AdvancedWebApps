import { Router } from "express";
import upload from "../middleware/upload";
import { uploadImage } from "../controllers/uploadController";

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Media upload endpoints
 */
const router = Router();

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload an image
 *     tags: [Upload]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *       400:
 *         description: Image file is missing or invalid
 */
router.post("/", upload.single("image"), uploadImage);

export default router;
