import { CanceledError } from "axios";
import { useEffect, useState } from "react";
import apiClient from "../services/api-client";

export interface Post {
  id: number;
  title: string;
  body: string;
  imageUrl?: string;
}

function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);

    apiClient
      .get<Post[]>("/posts", { signal: controller.signal })
      .then((response) => {
        setPosts(response.data);
        setError("");
      })
      .catch((err: unknown) => {
        if (err instanceof CanceledError) {
          return;
        }

        const message =
          err instanceof Error ? err.message : "Failed to fetch posts.";
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  return { posts, error, isLoading };
}

export default usePosts;
