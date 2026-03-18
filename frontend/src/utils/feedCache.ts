import type { Post } from "../types/models";

// module-level cache shared across usePosts hook instances - survives re-renders but not navigation
export const feedCache = {
  page: 1,
  posts: [] as Post[],
  hasMore: true,
};

// reset the cache, e.g. after logout or forced refresh
export const clearFeedCache = () => {
  feedCache.page = 1;
  feedCache.posts = [];
  feedCache.hasMore = true;
};
