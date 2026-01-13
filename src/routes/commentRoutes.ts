import { Router } from "express";
import * as controller from "../controllers/commentController";

const router = Router();

router.post("/", controller.createComment);
router.get("/", controller.getAllComments);
router.get("/:id", controller.getCommentById);
router.get("/post", controller.getCommentsByPost);
router.put("/:id", controller.updateComment);
router.delete("/:id", controller.deleteComment);

export default router;
