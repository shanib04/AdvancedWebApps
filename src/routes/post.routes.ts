import { Router } from "express";
import * as controller from "../controllers/post.controller";

const router = Router();

router.post("/", controller.createPost);
router.get("/", controller.getPosts);
router.get("/:id", controller.getPostById);
router.put("/:id", controller.updatePost);

export default router;
