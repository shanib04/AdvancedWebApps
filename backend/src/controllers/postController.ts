import { Response } from "express";
import Post from "../models/postModel";
import Comment from "../models/commentModel";
import { validateObjectId } from "./validateId";
import { AuthRequest } from "../middleware/authMiddleware";
import { getErrorMessage } from "../utils/getErrorMessage";

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { content, imageUrl } = req.body;
    if (!content) {
      return res.status(422).json({ error: "Content is required" });
    }
    const post = await Post.create({
      user: req.user._id,
      content,
      imageUrl,
    });
    const populatedPost = await Post.findById(post._id).populate(
      "user",
      "username photoUrl",
    );
    res.status(201).json(populatedPost);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getAllPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { user, page } = req.query as { user?: string; page?: string };
    if (user && !validateObjectId(user)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }

    const pageNumber = Number(page) || 1;
    const pageSize = 5;
    const skip = (pageNumber - 1) * pageSize;

    const posts = await Post.find(user ? { user } : {})
      .populate("user", "username photoUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
    res.json(posts);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getPostById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(422).json({ error: "Post ID is required" });
    }
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }
    const post = await Post.findById(id).populate("user", "username photoUrl");
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(post);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, imageUrl } = req.body;
    if (!id || !content) {
      return res
        .status(422)
        .json({ error: "Post ID and content are required" });
    }
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (!post.user || post.user.toString() !== req.user._id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    post.content = content;
    if (typeof imageUrl === "string") {
      post.imageUrl = imageUrl;
    }
    await post.save();
    const populatedPost = await Post.findById(post._id).populate(
      "user",
      "username photoUrl",
    );
    res.json(populatedPost);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (!post.user || post.user.toString() !== req.user._id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    await Comment.deleteMany({ post: id }); // Cascade delete comments
    await post.deleteOne();
    res.json({ message: "Post and related comments deleted successfully" });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!id) {
      return res.status(422).json({ error: "Post ID is required" });
    }

    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const likedUserIds = (post.likes ?? []).map((likeUserId) =>
      likeUserId.toString(),
    );
    const alreadyLiked = likedUserIds.includes(userId);

    const updateOperator = alreadyLiked
      ? { $pull: { likes: userId } }
      : { $addToSet: { likes: userId } };

    const updatedPost = await Post.findByIdAndUpdate(id, updateOperator, {
      new: true,
    }).populate("user", "username photoUrl");

    if (!updatedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      message: alreadyLiked ? "Post unliked" : "Post liked",
      likes: updatedPost.likes,
      post: updatedPost,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const toggleSave = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!id) {
      return res.status(422).json({ error: "Post ID is required" });
    }

    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const savedUserIds = (post.savedBy ?? []).map((savedUserId) =>
      savedUserId.toString(),
    );
    const alreadySaved = savedUserIds.includes(userId);

    const updateOperator = alreadySaved
      ? { $pull: { savedBy: userId } }
      : { $addToSet: { savedBy: userId } };

    const updatedPost = await Post.findByIdAndUpdate(id, updateOperator, {
      new: true,
    }).populate("user", "username photoUrl");

    if (!updatedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      message: alreadySaved ? "Post unsaved" : "Post saved",
      savedBy: updatedPost.savedBy,
      post: updatedPost,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getLikedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!validateObjectId(userId)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }

    const posts = await Post.find({ likes: userId })
      .populate("user", "username photoUrl")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getSavedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!validateObjectId(userId)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }

    const posts = await Post.find({ savedBy: userId })
      .populate("user", "username photoUrl")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};
