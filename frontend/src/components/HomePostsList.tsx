import type { RefObject } from "react";
import { Link } from "react-router-dom";
import type { Post } from "../types/models";
import PostCard from "./PostCard";

type FeedMode = "home" | "saved" | "liked";

type HomePostsListProps = {
  error: string;
  isLoading: boolean;
  posts: Post[];
  filteredPosts: Post[];
  filterAnimationSeed: number;
  currentUserId: string;
  onPostUpdated: (updatedPost: Post) => void;
  onPostDeleted: (postId: string) => void;
  onActionSuccess: (message: string) => void;
  onActionFailed: (message: string) => void;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  isSearchActive: boolean;
  isSearchFetching: boolean;
  hasMore: boolean;
  feedMode: FeedMode;
};

function HomePostsList({
  error,
  isLoading,
  posts,
  filteredPosts,
  filterAnimationSeed,
  currentUserId,
  onPostUpdated,
  onPostDeleted,
  onActionSuccess,
  onActionFailed,
  loadMoreRef,
  isSearchActive,
  isSearchFetching,
  hasMore,
  feedMode,
}: HomePostsListProps) {
  const hasNoPosts = !isLoading && !error && posts.length === 0;
  const hasNoVisiblePosts =
    !isLoading && !error && posts.length > 0 && filteredPosts.length === 0;

  const isSavedMode = feedMode === "saved";
  const isLikedMode = feedMode === "liked";

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
            key={`${post._id}-${filterAnimationSeed}`}
            post={post}
            currentUserId={currentUserId}
            onPostUpdated={onPostUpdated}
            onPostDeleted={onPostDeleted}
            onActionSuccess={onActionSuccess}
            onActionFailed={onActionFailed}
          />
        ))}
      </div>

      {hasNoPosts && (isSavedMode || isLikedMode) && (
        <div className="card border-0 shadow-sm rounded-5 empty-feed-state mt-1 mb-3">
          <div className="card-body p-4 p-md-5 text-center">
            <div className="empty-feed-icon-wrap mx-auto mb-3">
              <span className="material-symbols-outlined empty-feed-icon">
                {isSavedMode ? "bookmark" : "favorite"}
              </span>
            </div>
            <h5 className="fw-bold mb-2">
              {isSavedMode ? "No saved posts yet" : "No liked posts yet"}
            </h5>
            <p className="text-muted mb-4">
              {isSavedMode
                ? "Posts you save will appear here for quick access."
                : "Posts you like will appear here so you can revisit them later."}
            </p>
            <Link
              to="/home"
              className="btn rounded-pill px-4 py-2 fw-semibold empty-feed-cta"
            >
              Explore feed
            </Link>
          </div>
        </div>
      )}

      {hasNoVisiblePosts && (
        <div className="card border-0 shadow-sm rounded-5 empty-filter-state mt-1 mb-3">
          <div className="card-body p-4 text-center">
            <span className="material-symbols-outlined text-secondary mb-2">
              filter_alt_off
            </span>
            <h6 className="fw-semibold mb-1">No posts match your filters</h6>
            <p className="text-muted mb-0 small">
              Try clearing search text or selected users.
            </p>
          </div>
        </div>
      )}

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
