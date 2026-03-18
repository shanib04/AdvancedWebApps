import { useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Heart, FilterX } from "lucide-react";
import type { Post, User } from "../../types/models";
import PostCard from "./PostCard";
import { defaultUserPhotoUrl, normalizePhotoUrl } from "../../utils/photoUtils";

type FeedMode = "home" | "saved" | "liked";

type HomePostsListProps = {
  error: string;
  isLoading: boolean;
  posts: Post[];
  filteredPosts: Post[];
  filteredProfiles: User[];
  isProfileSearchLoading: boolean;
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
  filteredProfiles,
  isProfileSearchLoading,
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
  const isHomeMode = feedMode === "home";

  // collapse extra profile results when search query changes
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  // only show profile search results in home mode - saved/liked have no user search
  const visibleFilteredProfiles = isHomeMode ? filteredProfiles : [];
  const profileSearchLoading = isHomeMode && isProfileSearchLoading;
  const totalSearchResults =
    filteredPosts.length + visibleFilteredProfiles.length;
  const shouldShowAllProfiles = isSearchActive && showAllProfiles;
  const visibleProfiles = shouldShowAllProfiles
    ? visibleFilteredProfiles
    : visibleFilteredProfiles.slice(0, 3);

  return (
    <>
      {error && <div className="alert alert-danger">{error}</div>}
      {isLoading && posts.length === 0 && (
        <div className="d-flex flex-column gap-3 mb-3">
          <div className="card border-0 shadow-sm rounded-5 p-4 loading-card shimmer" />
          <div className="card border-0 shadow-sm rounded-5 p-4 loading-card shimmer" />
        </div>
      )}

      {isSearchActive && isHomeMode && (
        <div className="card border-0 shadow-sm rounded-5 mb-3">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0 fw-semibold">Profiles</h6>
              {profileSearchLoading && (
                <span className="d-inline-flex align-items-center gap-2 small text-muted">
                  <span className="spinner-border spinner-border-sm text-primary" />
                  Searching profiles...
                </span>
              )}
            </div>

            {visibleFilteredProfiles.length === 0 && !profileSearchLoading ? (
              <p className="text-muted mb-0 small">
                No profile matches for this search.
              </p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {visibleProfiles.map((profile) => (
                  <Link
                    key={profile._id}
                    to={`/profile/${profile._id}`}
                    className="text-decoration-none"
                  >
                    <div className="border rounded-4 p-3 d-flex align-items-center gap-3 bg-light-subtle profile-search-result overflow-hidden">
                      <img
                        src={normalizePhotoUrl(profile.photoUrl)}
                        alt={`${profile.username} avatar`}
                        className="rounded-circle"
                        style={{
                          width: "42px",
                          height: "42px",
                          objectFit: "cover",
                        }}
                        onError={(event) => {
                          const element = event.currentTarget;
                          if (element.src !== defaultUserPhotoUrl) {
                            element.src = defaultUserPhotoUrl;
                          }
                        }}
                      />
                      <div className="d-flex flex-column flex-grow-1 profile-search-meta">
                        <span className="fw-semibold text-dark text-truncate">
                          {profile.displayName || profile.username}
                        </span>
                        <span className="text-muted small text-truncate">
                          @{profile.username}
                        </span>
                        {profile.bio && (
                          <span className="text-muted small profile-search-bio">
                            {profile.bio}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}

                {visibleFilteredProfiles.length > 3 && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-start px-1"
                    onClick={() => setShowAllProfiles((prev) => !prev)}
                  >
                    {showAllProfiles ? "Show less" : "See all profiles"}
                  </button>
                )}
              </div>
            )}
          </div>
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
              {isSavedMode ? (
                <Bookmark
                  className="empty-feed-icon"
                  size={28}
                  strokeWidth={2.2}
                />
              ) : (
                <Heart
                  className="empty-feed-icon"
                  size={28}
                  strokeWidth={2.2}
                />
              )}
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
            <FilterX
              size={22}
              strokeWidth={2.2}
              className="text-secondary mb-2"
            />
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
          isSearchFetching || profileSearchLoading ? (
            <span className="d-inline-flex align-items-center gap-2">
              <span className="spinner-border spinner-border-sm text-primary" />
              Searching...
            </span>
          ) : (
            <span>
              {totalSearchResults} result
              {totalSearchResults === 1 ? "" : "s"}
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
