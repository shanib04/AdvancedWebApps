import { Router } from "express";
import * as controller from "../controllers/postController";

const router = Router();

router.post("/", controller.createPost);
router.get("/", controller.getAllPosts);
router.get("/:id", controller.getPostById);
router.put("/:id", controller.updatePost);

export default router;
