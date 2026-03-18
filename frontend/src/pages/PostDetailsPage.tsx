import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import apiClient from "../services/api-client";
import type { Post } from "../types/models";
import PostCard from "../components/PostCard";
import CommentsSection from "../components/comments/CommentsSection";
import LeftSidebar from "../components/LeftSidebar";
import Navbar from "../components/Navbar";
import useAppToast from "../hooks/useAppToast";
import AppToast from "../components/AppToast";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";
import { feedCache } from "../utils/feedCache";
import { mergePostState } from "../utils/postState";

type PostNavigationState = {
  focusCommentInput?: boolean;
  fromPath?: string;
};

const PostDetailsPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentCount, setCommentCount] = useState<number | undefined>(
    undefined,
  );
  const { toasts, showSuccess, showFailed, removeToast } = useAppToast();
  const navigationState =
    location.state && typeof location.state === "object"
      ? (location.state as PostNavigationState)
      : null;
  const shouldFocusCommentInput = Boolean(navigationState?.focusCommentInput);
  const fromPath =
    typeof navigationState?.fromPath === "string"
      ? navigationState.fromPath
      : "";
  const currentPathWithSearch = `${location.pathname}${location.search}`;
  const canNavigateToSource = Boolean(
    fromPath && fromPath !== currentPathWithSearch,
  );

  const returnLabel = fromPath.startsWith("/profile/")
    ? "Return to Profile"
    : fromPath.startsWith("/home")
      ? "Return to Feed"
      : "Return";

  const handleReturn = () => {
    if (canNavigateToSource) {
      navigate(fromPath);
      return;
    }

    navigate(-1);
  };

  const storedUserStr = localStorage.getItem("user");
  const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
  const currentUserId = storedUser?._id ?? "";

  useEffect(() => {
    if (shouldFocusCommentInput) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [postId, shouldFocusCommentInput]);

  useEffect(() => {
    if (!postId) return;

    const controller = new AbortController();
    const fetchPostAndComments = async () => {
      try {
        const { data } = await apiClient.get<Post>(`/post/${postId}`, {
          signal: controller.signal,
        });
        const cachedPost = feedCache.posts.find(
          (cached) => cached._id === data._id,
        );
        setPost(cachedPost ? mergePostState(cachedPost, data) : data);
        setError("");
        setLoading(false);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.name === "CanceledError" ||
            err.message === "canceled" ||
            controller.signal.aborted)
        ) {
          return;
        }
        setError(getUserFriendlyApiError(err, "Failed to load post"));
        setLoading(false);
      }
    };

    fetchPostAndComments();

    return () => {
      controller.abort();
    };
  }, [postId]);

  useEffect(() => {
    if (!post) return;
    const cachedPost = feedCache.posts.find((p) => p._id === post._id);
    if (!cachedPost) return;

    if (commentCount !== undefined) {
      cachedPost.comments = commentCount;
    }
  }, [post, commentCount]);

  const handlePostUpdated = (updatedPost: Post) => {
    setPost((prevPost) =>
      prevPost ? mergePostState(prevPost, updatedPost) : updatedPost,
    );
    const cachedPost = feedCache.posts.find((p) => p._id === updatedPost._id);
    if (cachedPost) {
      Object.assign(cachedPost, mergePostState(cachedPost, updatedPost));
    }
  };

  if (loading) {
    return (
      <main className="container-fluid min-vh-100 px-0 pb-4">
        <Navbar searchValue="" onSearchChange={() => {}} hideSearch={true} />
        <div className="container mt-4 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="container-fluid min-vh-100 px-0 pb-4">
        <Navbar searchValue="" onSearchChange={() => {}} hideSearch={true} />
        <div className="container mt-4">
          <div className="alert alert-danger">
            {error || "Post not found."}
            <div className="mt-2">
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => navigate("/home")}
              >
                Go back home
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Find post author ID
  const authorId = typeof post.user === "string" ? post.user : post.user?._id;

  return (
    <main className="container-fluid min-vh-100 px-0 pb-4">
      <AppToast toasts={toasts} onClose={removeToast} />
      <Navbar searchValue="" onSearchChange={() => {}} hideSearch={true} />
      <div className="container py-4">
        <div className="row g-4">
          {/* Left Sidebar */}
          <div className="col-12 col-md-3 d-none d-md-block">
            <div className="position-sticky" style={{ top: "85px" }}>
              <div className="mb-4">
                <button
                  className="btn w-100 d-flex align-items-center justify-content-center gap-2 rounded-pill fw-semibold back-feed-btn"
                  onClick={handleReturn}
                >
                  <ArrowLeft size={18} strokeWidth={2.2} />
                  {returnLabel}
                </button>
              </div>
              <LeftSidebar />
            </div>
          </div>

          {/* Main Feed Content */}
          <div className="col-12 col-md-6">
            <div className="mb-3 d-md-none">
              <button
                className="btn btn-sm rounded-pill d-inline-flex align-items-center gap-2 back-feed-btn"
                onClick={handleReturn}
              >
                <ArrowLeft size={16} strokeWidth={2.2} />
                {returnLabel}
              </button>
            </div>

            <PostCard
              post={post}
              currentUserId={currentUserId}
              dynamicCommentCount={commentCount}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={() => {
                showSuccess("Post deleted");
                navigate("/home");
              }}
              onActionSuccess={showSuccess}
              onActionFailed={showFailed}
            />

            <div className="mt-4 bg-white p-4 rounded-4 shadow-sm">
              <h4 className="mb-4">Comments</h4>
              <CommentsSection
                postId={post._id}
                postAuthorId={authorId || ""}
                onCommentsChange={setCommentCount}
                autoFocusInput={shouldFocusCommentInput}
              />
            </div>
          </div>

          <div className="col-12 col-md-3 d-none d-md-block"></div>
        </div>
      </div>
    </main>
  );
};

export default PostDetailsPage;
