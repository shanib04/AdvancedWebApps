import { Router } from "express";
import upload from "../middleware/upload";
import { uploadImage } from "../controllers/uploadController";

const router = Router();

router.post("/", upload.single("image"), uploadImage);

export default router;
