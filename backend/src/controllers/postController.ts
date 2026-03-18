import { Response } from "express";
import Post from "../models/postModel";
import Comment from "../models/commentModel";
import Like from "../models/likeModel";
import Save from "../models/saveModel";
import { validateObjectId } from "./validateId";
import { AuthRequest } from "../middleware/authMiddleware";
import { getErrorMessage } from "../utils/getErrorMessage";
import { HandlerResponse } from "../types/models";

// create new post
export const createPost = async (
  req: AuthRequest,
  res: Response,
): HandlerResponse => {
  try {
    const { content, imageUrl } = req.body;
    // validate required field
    if (!content) {
      return res.status(422).json({ error: "Content is required" });
    }
    // save to db
    const post = await Post.create({
      user: req.user._id,
      content,
      imageUrl,
    });
    // fetch with user info
    const populatedPost = await Post.findById(post._id).populate(
      "user",
      "username displayName photoUrl",
    );
    res.status(201).json(populatedPost);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// get all posts with pagination and user's like/save status
export const getAllPosts = async (
  req: AuthRequest,
  res: Response,
): HandlerResponse => {
  try {
    const { user, page } = req.query as { user?: string; page?: string };
    // validate user id if provided
    if (user && !validateObjectId(user)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }

    const pageNumber = Number(page) || 1;
    const pageSize = 5;
    const skip = (pageNumber - 1) * pageSize;

    // fetch posts with pagination
    const posts = await Post.find(user ? { user } : {})
      .populate("user", "username displayName photoUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const postIds = posts.map((post) => post._id);
    const currentUserId = req.user._id;

    // batch fetch likes & saves for all posts
    const [likes, saves] = await Promise.all([
      Like.find({ userId: currentUserId, postId: { $in: postIds } }),
      Save.find({ userId: currentUserId, postId: { $in: postIds } }),
    ]);

    const likedPostIds = new Set(likes.map((like) => like.postId.toString()));
    const savedPostIds = new Set(saves.map((save) => save.postId.toString()));
    // Fetch comment count for each post
    const postsWithDetails = await Promise.all(
      posts.map(async (post) => {
        const comments = await Comment.countDocuments({ post: post._id });
        return {
          ...post.toObject(),
          comments,
          isLiked: likedPostIds.has(post._id.toString()),
          isSaved: savedPostIds.has(post._id.toString()),
        };
      }),
    );

    res.json(postsWithDetails);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// get single post by id with like/save status
export const getPostById = async (
  req: AuthRequest,
  res: Response,
): HandlerResponse => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    // validate required param
    if (!id) {
      return res.status(422).json({ error: "Post ID is required" });
    }
    // validate id format
    if (!validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }
    // fetch post with user details
    const post = await Post.findById(id).populate(
      "user",
      "username displayName photoUrl",
    );
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const [isLiked, isSaved] = await Promise.all([
      Like.exists({ userId, postId: id }),
      Save.exists({ userId, postId: id }),
    ]);

    res.json({
      ...post.toObject(),
      isLiked: Boolean(isLiked),
      isSaved: Boolean(isSaved),
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const updatePost = async (
  req: AuthRequest,
  res: Response,
): HandlerResponse => {
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
      "username displayName photoUrl",
    );
    res.json(populatedPost);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const deletePost = async (
  req: AuthRequest,
  res: Response,
): HandlerResponse => {
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
    await Like.deleteMany({ postId: id }); // Cascade delete likes
    await Save.deleteMany({ postId: id }); // Cascade delete saves
    await post.deleteOne();
    res.json({ message: "Post and related comments deleted successfully" });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const toggleLike = async (
  req: AuthRequest,
  res: Response,
): HandlerResponse => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!id || !validateObjectId(id)) {
      return res.status(422).json({ error: "Invalid Post ID format" });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const existingLike = await Like.findOne({ userId, postId: id });

    let updatedPost;
    let actionMessage;

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      updatedPost = await Post.findByIdAndUpdate(
        id,
        { $inc: { likeCount: -1 } },
        { new: true },
      ).populate("user", "username displayName photoUrl");
      actionMessage = "Post unliked";
    } else {
      await Like.create({ userId, postId: id as string });
      updatedPost = await Post.findByIdAndUpdate(
        id,
        { $inc: { likeCount: 1 } },
        { new: true },
      ).populate("user", "username displayName photoUrl");
      actionMessage = "Post liked";
    }

    if (!updatedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      message: actionMessage,
      post: { ...updatedPost.toObject(), isLiked: !existingLike },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const toggleSave = async (
  req: AuthRequest,
  res: Response,
): HandlerResponse => {
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

    const existingSave = await Save.findOne({ userId, postId: id });

    let updatedPost;
    let actionMessage;

    if (existingSave) {
      await Save.deleteOne({ _id: existingSave._id });
      updatedPost = await Post.findById(id).populate(
        "user",
        "username displayName photoUrl",
      );
      actionMessage = "Post unsaved";
    } else {
      await Save.create({ userId, postId: id as string });
      updatedPost = await Post.findById(id).populate(
        "user",
        "username displayName photoUrl",
      );
      actionMessage = "Post saved";
    }

    if (!updatedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      message: actionMessage,
      post: { ...updatedPost.toObject(), isSaved: !existingSave },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getLikedPosts = async (
  req: AuthRequest,
  res: Response,
): HandlerResponse => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (!validateObjectId(userId)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }

    if (userId !== currentUserId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const likes = await Like.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "postId",
        populate: { path: "user", select: "username displayName photoUrl" },
      });

    // Map and filter out any null posts in case they were deleted
    const validPosts = likes.map((like) => like.postId).filter(Boolean);
    const postIds = validPosts.map((post: any) => post._id);

    // Also populate comment count and boolean flags
    const saves = await Save.find({
      userId: currentUserId,
      postId: { $in: postIds },
    });
    const savedPostIds = new Set(saves.map((s) => s.postId.toString()));

    const postsWithDetails = await Promise.all(
      validPosts.map(async (rawPost) => {
        const post = rawPost as any;
        const comments = await Comment.countDocuments({ post: post._id });
        return {
          ...(typeof post.toObject === "function" ? post.toObject() : post),
          comments,
          isLiked: true,
          isSaved: savedPostIds.has(post._id.toString()),
        };
      }),
    );

    res.json(postsWithDetails);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getSavedPosts = async (
  req: AuthRequest,
  res: Response,
): HandlerResponse => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (!validateObjectId(userId)) {
      return res.status(422).json({ error: "Invalid User ID format" });
    }

    if (userId !== currentUserId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const saves = await Save.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "postId",
        populate: { path: "user", select: "username displayName photoUrl" },
      });

    // Map and filter out any null posts in case they were deleted
    const validPosts = saves.map((save) => save.postId).filter(Boolean);
    const postIds = validPosts.map((post: any) => post._id);

    // Also populate comment count and boolean flags
    const likes = await Like.find({
      userId: currentUserId,
      postId: { $in: postIds },
    });
    const likedPostIds = new Set(likes.map((l) => l.postId.toString()));

    const postsWithDetails = await Promise.all(
      validPosts.map(async (rawPost) => {
        const post = rawPost as any;
        const comments = await Comment.countDocuments({ post: post._id });
        return {
          ...(typeof post.toObject === "function" ? post.toObject() : post),
          comments,
          isSaved: true,
          isLiked: likedPostIds.has(post._id.toString()),
        };
      }),
    );

    res.json(postsWithDetails);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};
