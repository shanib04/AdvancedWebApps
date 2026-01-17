import { Router } from "express";
import * as controller from "../controllers/userController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

router.post("/", authMiddleware, controller.createUser);
router.get("/", authMiddleware, controller.getAllUsers);
router.get("/whoami", authMiddleware, controller.getCurrentUser);
router.get("/:id", authMiddleware, controller.getUserById);
router.put("/:id", authMiddleware, controller.updateUser);
router.delete("/:id", authMiddleware, controller.deleteUser);

export default router;
