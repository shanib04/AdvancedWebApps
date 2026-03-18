import type { Post } from "../types/models";

// shared cache for usePosts instances
export const feedCache = {
  page: 1,
  posts: [] as Post[],
  hasMore: true,
};

// reset the feed cache
export const clearFeedCache = () => {
  feedCache.page = 1;
  feedCache.posts = [];
  feedCache.hasMore = true;
};
