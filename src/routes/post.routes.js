// post.routes.js
const express = require("express");
const {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
} = require("../controllers/post.controller");

const router = express.Router();

router.post("/", createPost);
router.get("/", getAllPosts);
router.get("/:id", getPostById);
router.put("/:id", updatePost);

module.exports = router;
