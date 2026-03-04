import { useEffect, useRef, useState } from "react";
import apiClient from "../services/api-client";

export interface Post {
  _id: string;
  user: string | { _id: string; username?: string; photoUrl?: string };
  content: string;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  likes?: string[];
  savedBy?: string[];
  comments?: number;
}

function usePosts(page: number) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const latestRequestId = useRef(0);

  useEffect(() => {
    const loadPosts = async () => {
      const requestId = ++latestRequestId.current;
      setIsLoading(true);
      setError("");

      try {
        const response = await apiClient.get<Post[]>(`/post?page=${page}`);

        const newPosts = Array.isArray(response.data) ? response.data : [];
        setHasMore(newPosts.length > 0);
        setPosts((prevPosts) => {
          const merged = [...prevPosts, ...newPosts];
          const uniquePosts = new Map<string, Post>();

          merged.forEach((post) => {
            uniquePosts.set(post._id, post);
          });

          return Array.from(uniquePosts.values());
        });
      } catch {
        setError("Failed to load posts.");
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
