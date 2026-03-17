import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import usePosts from "../hooks/usePosts";
import type { Post } from "../types/models";
import { feedCache } from "../utils/feedCache";
import useAppToast from "../hooks/useAppToast";
import {
  getStoredSessionUser,
  syncStoredUserFromWhoAmI,
  type SessionUser,
} from "../utils/sessionUser";
import AppToast from "./AppToast";
import CreatePostBox from "./CreatePostBox";
import HomeDraftStudio from "./HomeDraftStudio";
import HomePostsList from "./HomePostsList";
import LeftSidebar from "./LeftSidebar";
import Navbar from "./Navbar";
import RightAIWidget from "./RightAIWidget";
import UserFilterWidget from "./UserFilterWidget";
import "../styles/feed-modern.css";
import { normalizePhotoUrl } from "../utils/photoUtils";
import { mergePostIntoList } from "../utils/postState";
import apiClient from "../services/api-client";

type InitialDraftPayload = {
  text: string;
  keyword: string;
  images: string[];
  includeImagesRequested: boolean;
};

function HomeFeed() {
  const [searchParams] = useSearchParams();
  const isSavedMode = searchParams.get("saved") === "true";
  const isLikedMode = searchParams.get("liked") === "true";
  const [page, setPage] = useState(feedCache.page);

  useEffect(() => {
    feedCache.page = page;
  }, [page]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [selectedUserFilterIds, setSelectedUserFilterIds] = useState<string[]>(
    [],
  );
  const [filterAnimationSeed, setFilterAnimationSeed] = useState(0);
  const [draftPayload, setDraftPayload] = useState<InitialDraftPayload | null>(
    null,
  );
  const [showGoToTop, setShowGoToTop] = useState(false);
  const { toasts, removeToast, showFailed, showSuccess } = useAppToast();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queuedSearchPageRef = useRef(false);

  // Custom posts state for saved mode
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedError, setSavedError] = useState("");
  const [savedIsLoading, setSavedIsLoading] = useState(false);

  // Custom posts state for liked mode
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [likedError, setLikedError] = useState("");
  const [likedIsLoading, setLikedIsLoading] = useState(false);

  // Use different posts based on mode
  const { posts, setPosts, error, isLoading, hasMore } = usePosts(page);
  const currentPosts = isSavedMode
    ? savedPosts
    : isLikedMode
      ? likedPosts
      : posts;
  const currentError = isSavedMode
    ? savedError
    : isLikedMode
      ? likedError
      : error;
  const currentIsLoading = isSavedMode
    ? savedIsLoading
    : isLikedMode
      ? likedIsLoading
      : isLoading;

  const initialUser = useMemo(() => getStoredSessionUser(), []);

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(
    initialUser,
  );

  useEffect(() => {
    const abortController = new AbortController();

    const syncCurrentUser = async () => {
      try {
        const mergedUser = await syncStoredUserFromWhoAmI(initialUser);
        if (!abortController.signal.aborted) {
          setCurrentUser(mergedUser);
        }
      } catch {
        if (!abortController.signal.aborted) {
          setCurrentUser(initialUser);
        }
      }
    };

    syncCurrentUser();

    // Listen for session user updates
    const handleSessionUserUpdate = (event: CustomEvent<SessionUser>) => {
      setCurrentUser(event.detail);
    };

    window.addEventListener(
      "sessionUserUpdated",
      handleSessionUserUpdate as EventListener,
    );

    return () => {
      abortController.abort();
      window.removeEventListener(
        "sessionUserUpdated",
        handleSessionUserUpdate as EventListener,
      );
    };
  }, [initialUser]);

  const currentUserId = currentUser?._id ?? "";
  const currentUserPhoto = normalizePhotoUrl(currentUser?.photoUrl);

  useEffect(() => {
    if (!currentUserId) return;

    const patchAuthoredPosts = (items: Post[]) =>
      items.map((post) => {
        if (typeof post.user !== "object" || post.user === null) {
          return post;
        }

        if (post.user._id !== currentUserId) {
          return post;
        }

        return {
          ...post,
          user: {
            ...post.user,
            username: currentUser?.username || post.user.username,
            displayName: currentUser?.displayName,
            photoUrl: currentUser?.photoUrl || post.user.photoUrl,
          },
        };
      });

    setPosts((prevPosts) => patchAuthoredPosts(prevPosts));
    setSavedPosts((prevPosts) => patchAuthoredPosts(prevPosts));
    setLikedPosts((prevPosts) => patchAuthoredPosts(prevPosts));
  }, [
    currentUserId,
    currentUser?.username,
    currentUser?.displayName,
    currentUser?.photoUrl,
    setPosts,
  ]);

  // Fetch saved posts when in saved mode
  useEffect(() => {
    if (!isSavedMode || !currentUserId) return;

    const fetchSavedPosts = async () => {
      setSavedIsLoading(true);
      setSavedError("");

      try {
        const response = await apiClient.get<Post[]>(
          `/post/user/${currentUserId}/saved`,
        );
        setSavedPosts(response.data || []);
      } catch (err: unknown) {
        console.error("Failed to load saved posts:", err);
        setSavedError("Failed to load saved posts.");
        setSavedPosts([]);
      } finally {
        setSavedIsLoading(false);
      }
    };

    fetchSavedPosts();
  }, [isSavedMode, currentUserId]);

  // Fetch liked posts when in liked mode
  useEffect(() => {
    if (!isLikedMode || !currentUserId) return;

    const fetchLikedPosts = async () => {
      setLikedIsLoading(true);
      setLikedError("");

      try {
        const response = await apiClient.get<Post[]>(
          `/post/user/${currentUserId}/liked`,
        );
        setLikedPosts(response.data || []);
      } catch (err: unknown) {
        console.error("Failed to load liked posts:", err);
        setLikedError("Failed to load liked posts.");
        setLikedPosts([]);
      } finally {
        setLikedIsLoading(false);
      }
    };

    fetchLikedPosts();
  }, [isLikedMode, currentUserId]);

  // Update page title based on mode
  useEffect(() => {
    if (isSavedMode) {
      document.title = "Saved Posts - Advanced Web Apps";
    } else if (isLikedMode) {
      document.title = "Liked Posts - Advanced Web Apps";
    } else {
      document.title = "Home - Advanced Web Apps";
    }
  }, [isSavedMode, isLikedMode]);

  const filteredPosts = useMemo(() => {
    let result = currentPosts;

    if (selectedUserFilterIds.length > 0) {
      result = result.filter((post) => {
        if (
          typeof post.user === "object" &&
          post.user !== null &&
          post.user._id
        ) {
          return selectedUserFilterIds.includes(post.user._id);
        }
        return false;
      });
    }

    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return result;
    }

    return result.filter((post) => {
      const contentText = post.content ?? "";
      const contentMatch = contentText.toLowerCase().includes(normalized);
      const userName =
        typeof post.user === "object" && post.user !== null
          ? (post.user.username ?? "")
          : "";
      const userMatch = userName.toLowerCase().includes(normalized);
      return contentMatch || userMatch;
    });
  }, [currentPosts, searchTerm, selectedUserFilterIds]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const isSearchActive = normalizedSearchTerm.length > 0;
  const isSearchFetching = isSearchActive && hasMore;

  useEffect(() => {
    if (!isSearchActive) {
      queuedSearchPageRef.current = false;
      return;
    }

    const needsMoreForSearch = hasMore;

    if (!needsMoreForSearch) {
      queuedSearchPageRef.current = false;
      return;
    }

    if (!isLoading && !queuedSearchPageRef.current) {
      queuedSearchPageRef.current = true;
      const timerId = window.setTimeout(() => {
        setPage((prevPage) => prevPage + 1);
      }, 0);

      return () => {
        window.clearTimeout(timerId);
      };
    }
  }, [isSearchActive, isLoading, hasMore, filteredPosts.length]);

  useEffect(() => {
    if (isLoading) {
      queuedSearchPageRef.current = false;
    }
  }, [isLoading]);

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element || isLoading || !hasMore || isSearchActive) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prevPage) => prevPage + 1);
        }
      },
      {
        rootMargin: "200px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isLoading, hasMore, isSearchActive]);

  useEffect(() => {
    const handleScroll = () => {
      setShowGoToTop(window.scrollY > 260);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const resetDraftMode = () => {
    setIsDraftMode(false);
    setDraftPayload(null);
  };

  const handleInitialDraftGenerated = (payload: InitialDraftPayload) => {
    setDraftPayload(payload);
    setIsDraftMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (payload.includeImagesRequested && (payload.images || []).length === 0) {
      showFailed(
        "We generated your text, but couldn't find a perfect automatic image. You can search for one manually below!",
      );
    }
  };

  const handleDraftPublished = (createdPost: Post) => {
    setPosts((prevPosts) => [createdPost, ...prevPosts]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts(
      (prevPosts) => mergePostIntoList(prevPosts, updatedPost).updatedPosts,
    );
    setSavedPosts(
      (prevPosts) => mergePostIntoList(prevPosts, updatedPost).updatedPosts,
    );
    setLikedPosts(
      (prevPosts) => mergePostIntoList(prevPosts, updatedPost).updatedPosts,
    );
    feedCache.posts = mergePostIntoList(
      feedCache.posts,
      updatedPost,
    ).updatedPosts;
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
  };

  const handleGoToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleUserFilter = (userId: string) => {
    setSelectedUserFilterIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
    setFilterAnimationSeed((prev) => prev + 1);
  };

  return (
    <main className="container-fluid min-vh-100 px-0 pb-4">
      <AppToast toasts={toasts} onClose={removeToast} />
      <Navbar searchValue={searchTerm} onSearchChange={setSearchTerm} />

      <div className="container">
        <div className="row g-4">
          <aside
            className="col-lg-3 d-none d-lg-block position-sticky"
            style={{ top: "85px", alignSelf: "start" }}
          >
            <LeftSidebar
              activePage={
                isSavedMode ? "saved" : isLikedMode ? "liked" : "home"
              }
            />
          </aside>

          <section className="col-12 col-lg-6">
            {!isSavedMode && !isLikedMode && (
              <div className="card border-0 shadow-sm rounded-5 mb-4 create-post-card">
                <div className="card-body p-4">
                  {!isDraftMode ? (
                    <CreatePostBox
                      currentUserPhoto={currentUserPhoto}
                      onPostCreated={(post) => {
                        setPosts((prev) => [post, ...prev]);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      onActionSuccess={showSuccess}
                      onActionFailed={showFailed}
                    />
                  ) : (
                    <HomeDraftStudio
                      initialDraft={
                        draftPayload || {
                          text: "",
                          keyword: "",
                          images: [],
                          includeImagesRequested: true,
                        }
                      }
                      onClose={resetDraftMode}
                      onDraftPublished={handleDraftPublished}
                      onActionSuccess={showSuccess}
                      onActionFailed={showFailed}
                    />
                  )}
                </div>
              </div>
            )}

            <HomePostsList
              error={currentError}
              isLoading={currentIsLoading}
              posts={currentPosts}
              filteredPosts={filteredPosts}
              filterAnimationSeed={filterAnimationSeed}
              currentUserId={currentUserId}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
              onActionSuccess={showSuccess}
              onActionFailed={showFailed}
              loadMoreRef={loadMoreRef}
              isSearchActive={isSearchActive}
              isSearchFetching={isSearchFetching}
              hasMore={hasMore}
            />
          </section>

          <aside className="col-lg-3 d-none d-lg-block">
            {!isSavedMode && !isLikedMode && (
              <RightAIWidget
                onInitialDraftGenerated={handleInitialDraftGenerated}
              />
            )}
            {(isSavedMode || isLikedMode) && currentPosts.length > 0 && (
              <div className="position-sticky" style={{ top: "85px" }}>
                <UserFilterWidget
                  posts={currentPosts}
                  title={isSavedMode ? "Saved from users" : "Liked from users"}
                  selectedUserIds={selectedUserFilterIds}
                  onToggleUser={handleToggleUserFilter}
                />
              </div>
            )}
          </aside>
        </div>
      </div>

      {showGoToTop && (
        <button
          type="button"
          className="btn btn-primary btn-sm rounded-circle position-fixed d-inline-flex align-items-center justify-content-center p-0"
          onClick={handleGoToTop}
          aria-label="Go to top"
          style={{
            right: "18px",
            bottom: "18px",
            width: "40px",
            height: "40px",
            zIndex: 1030,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "18px" }}
          >
            arrow_upward
          </span>
        </button>
      )}
    </main>
  );
}

export default HomeFeed;
