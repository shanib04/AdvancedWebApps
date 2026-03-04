import type { RefObject } from "react";
import type { Post } from "../hooks/usePosts";
import PostCard from "./PostCard";

type HomePostsListProps = {
  error: string;
  isLoading: boolean;
  posts: Post[];
  filteredPosts: Post[];
  currentUserId: string;
  onPostUpdated: (updatedPost: Post) => void;
  onPostDeleted: (postId: string) => void;
  onActionSuccess: (message: string) => void;
  onActionFailed: (message: string) => void;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  isSearchActive: boolean;
  isSearchFetching: boolean;
  hasMore: boolean;
};

function HomePostsList({
  error,
  isLoading,
  posts,
  filteredPosts,
  currentUserId,
  onPostUpdated,
  onPostDeleted,
  onActionSuccess,
  onActionFailed,
  loadMoreRef,
  isSearchActive,
  isSearchFetching,
  hasMore,
}: HomePostsListProps) {
  return (
    <>
      {error && <div className="alert alert-danger">{error}</div>}
      {isLoading && posts.length === 0 && (
        <div className="d-flex flex-column gap-3 mb-3">
          <div className="card border-0 shadow-sm rounded-5 p-4 loading-card shimmer" />
          <div className="card border-0 shadow-sm rounded-5 p-4 loading-card shimmer" />
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {filteredPosts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            currentUserId={currentUserId}
            onPostUpdated={onPostUpdated}
            onPostDeleted={onPostDeleted}
            onActionSuccess={onActionSuccess}
            onActionFailed={onActionFailed}
          />
        ))}
      </div>

      <div
        ref={loadMoreRef}
        className="py-4 text-center text-muted loader-slot"
      >
        {isSearchActive ? (
          isSearchFetching ? (
            <span className="d-inline-flex align-items-center gap-2">
              <span className="spinner-border spinner-border-sm text-primary" />
              Searching more posts...
            </span>
          ) : (
            <span>
              {filteredPosts.length} result
              {filteredPosts.length === 1 ? "" : "s"}
            </span>
          )
        ) : isLoading ? (
          <span className="d-inline-flex align-items-center gap-2">
            <span className="spinner-border spinner-border-sm text-primary" />
            Loading more posts...
          </span>
        ) : hasMore ? (
          "Scroll for more"
        ) : (
          "No more posts"
        )}
      </div>
    </>
  );
}

export default HomePostsList;
