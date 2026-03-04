import type { Post } from "../types/models";

export const feedCache = {
  page: 1,
  posts: [] as Post[],
  hasMore: true,
};

export const clearFeedCache = () => {
  feedCache.page = 1;
  feedCache.posts = [];
  feedCache.hasMore = true;
};
