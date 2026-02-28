import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import usePosts from "../hooks/usePosts";
import type { Post } from "../hooks/usePosts";
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
import "../styles/feed-modern.css";

type InitialDraftPayload = {
  text: string;
  keyword: string;
  images: string[];
  includeImagesRequested: boolean;
};

function HomeFeed() {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
  const defaultPhotoUrl = `${apiBaseUrl}/public/images/default-user.svg`;

  const normalizePhotoUrl = useCallback(
    (value?: string) => {
      if (!value) {
        return defaultPhotoUrl;
      }

      if (/^https?:\/\//i.test(value)) {
        return value;
      }

      if (value.startsWith("/")) {
        return `${apiBaseUrl}${value}`;
      }

      return value;
    },
    [apiBaseUrl, defaultPhotoUrl],
  );

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [draftPayload, setDraftPayload] = useState<InitialDraftPayload | null>(
    null,
  );
  const [showGoToTop, setShowGoToTop] = useState(false);
  const { posts, setPosts, error, isLoading, hasMore } = usePosts(page);
  const { toasts, removeToast, showFailed, showSuccess } = useAppToast();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queuedSearchPageRef = useRef(false);

  const initialUser = useMemo(() => getStoredSessionUser(), []);

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(
    initialUser,
  );

  useEffect(() => {
    const abortController = new AbortController();

    const syncCurrentUser = async () => {
      try {
        const mergedUser = await syncStoredUserFromWhoAmI(
          initialUser,
          normalizePhotoUrl,
        );
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

    return () => {
      abortController.abort();
    };
  }, [initialUser, normalizePhotoUrl]);

  const currentUserId = currentUser?._id ?? "";
  const currentUserPhoto = normalizePhotoUrl(currentUser?.photoUrl);

  const filteredPosts = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return posts;
    }

    return posts.filter((post) => {
      const contentText = post.content ?? "";
      const contentMatch = contentText.toLowerCase().includes(normalized);
      const userName =
        typeof post.user === "object" ? (post.user.username ?? "") : "";
      const userMatch = userName.toLowerCase().includes(normalized);
      return contentMatch || userMatch;
    });
  }, [posts, searchTerm]);

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
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === updatedPost._id ? updatedPost : post,
      ),
    );
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleGoToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="container-fluid feed-soft-bg min-vh-100 pb-4">
      <AppToast toasts={toasts} onClose={removeToast} />
      <Navbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onLogout={handleLogout}
      />

      <div className="container">
        <div className="row g-4">
          <aside className="col-lg-3 d-none d-lg-block">
            <LeftSidebar />
          </aside>

          <section className="col-12 col-lg-6">
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

            <HomePostsList
              error={error}
              isLoading={isLoading}
              posts={posts}
              filteredPosts={filteredPosts}
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
            <RightAIWidget
              onInitialDraftGenerated={handleInitialDraftGenerated}
            />
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
