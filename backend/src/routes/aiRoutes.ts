import { Router } from "express";
import {
  generateInitialDraft,
  getMoreImages,
  refineText,
} from "../controllers/aiController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

router.post("/generateInitialDraft", authMiddleware, generateInitialDraft);
router.post("/refineText", authMiddleware, refineText);
router.post("/getMoreImages", authMiddleware, getMoreImages);

export default router;
