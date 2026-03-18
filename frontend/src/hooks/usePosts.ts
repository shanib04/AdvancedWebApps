import { useEffect, useRef, useState } from "react";
import apiClient from "../services/api-client";
import { feedCache, clearFeedCache } from "../utils/feedCache";
import { mergePostState } from "../utils/postState";
import type { Post } from "../types/models";
import axios from "axios";

function usePosts(page: number) {
  const [posts, setPosts] = useState<Post[]>(feedCache.posts);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(feedCache.posts.length === 0);
  const [hasMore, setHasMore] = useState(feedCache.hasMore);
  // track latest request so stale responses from previous pages don't override newer ones
  const latestRequestId = useRef(0);

  useEffect(() => {
    const loadPosts = async () => {
      const requestId = ++latestRequestId.current;
      setIsLoading(true);
      setError("");

      try {
        const response = await apiClient.get<Post[]>(`/post?page=${page}`);

        const newPosts = Array.isArray(response.data) ? response.data : [];
        const newHasMore = newPosts.length > 0;
        setHasMore(newHasMore);
        feedCache.hasMore = newHasMore;

        setPosts((prevPosts) => {
          // deduplicate by id so paginated results don't duplicate existing posts
          const uniquePosts = new Map<string, Post>();

          prevPosts.forEach((post) => {
            uniquePosts.set(post._id, post);
          });

          newPosts.forEach((post) => {
            const existingPost = uniquePosts.get(post._id);
            uniquePosts.set(
              post._id,
              existingPost ? mergePostState(existingPost, post) : post,
            );
          });

          const newlyMerged = Array.from(uniquePosts.values());
          feedCache.posts = newlyMerged;
          return newlyMerged;
        });
      } catch (err: unknown) {
        setError("Failed to load posts.");
        setHasMore(false);
        feedCache.hasMore = false;

        // session expired - wipe credentials and go to login
        if (
          axios.isAxiosError(err) &&
          (err.response?.status === 401 || err.response?.status === 403)
        ) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          clearFeedCache();
          window.location.href = "/login";
        }
      } finally {
        if (requestId === latestRequestId.current) {
          setIsLoading(false);
        }
      }
    };

    loadPosts();
  }, [page]);

  return { posts, setPosts, error, isLoading, hasMore };
}

export default usePosts;
