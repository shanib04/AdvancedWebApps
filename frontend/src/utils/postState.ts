import type { Post } from "../types/models";

const hasOwn = (obj: object, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(obj, key);

// merge server post into existing post, keeping client-side flags
export const mergePostState = (currentPost: Post, incomingPost: Post): Post => {
  const merged: Post = {
    ...currentPost,
    ...incomingPost,
  };

  if (!hasOwn(incomingPost, "isLiked") || incomingPost.isLiked === undefined) {
    merged.isLiked = currentPost.isLiked;
  }

  if (!hasOwn(incomingPost, "isSaved") || incomingPost.isSaved === undefined) {
    merged.isSaved = currentPost.isSaved;
  }

  if (
    !hasOwn(incomingPost, "likeCount") ||
    incomingPost.likeCount === undefined
  ) {
    merged.likeCount = currentPost.likeCount;
  }

  if (
    !hasOwn(incomingPost, "comments") ||
    incomingPost.comments === undefined
  ) {
    merged.comments = currentPost.comments;
  }

  if (!hasOwn(incomingPost, "user") || incomingPost.user === undefined) {
    merged.user = currentPost.user;
  }

  return merged;
};

// update a single post in a list by id, returns new list and whether the post was found
export const mergePostIntoList = (
  posts: Post[],
  incomingPost: Post,
): { updatedPosts: Post[]; wasUpdated: boolean } => {
  let wasUpdated = false;

  const updatedPosts = posts.map((post) => {
    if (post._id !== incomingPost._id) {
      return post;
    }

    wasUpdated = true;
    return mergePostState(post, incomingPost);
  });

  return { updatedPosts, wasUpdated };
};
