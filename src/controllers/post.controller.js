// post.controller.js
const Post = require("../models/post.model");

exports.createPost = async (req, res) => {
  const { sender, content } = req.body;
  const post = await Post.create({ sender, content });
  res.json(post);
};

exports.getAllPosts = async (req, res) => {
  const { sender } = req.query;
  const filter = sender ? { sender } : {};
  const posts = await Post.find(filter);
  res.json(posts);
};

exports.getPostById = async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id);
  res.json(post);
};

exports.updatePost = async (req, res) => {
  const { id } = req.params;
  const { sender, content } = req.body;
  const post = await Post.findByIdAndUpdate(
    id,
    { sender, content },
    { new: true }
  );
  res.json(post);
};
