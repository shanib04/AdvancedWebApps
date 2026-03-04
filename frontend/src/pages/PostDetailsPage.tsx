import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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

  const storedUserStr = localStorage.getItem("user");
  const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
  const currentUserId = storedUser?._id ?? "";

  useEffect(() => {
    if (!postId) return;

    const controller = new AbortController();
    const fetchPostAndComments = async () => {
      try {
        const { data } = await apiClient.get<Post>(`/post/${postId}`, {
          signal: controller.signal,
        });
        setPost(data);
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
    setPost(updatedPost);
    const cachedPost = feedCache.posts.find((p) => p._id === updatedPost._id);
    if (cachedPost) {
      Object.assign(cachedPost, updatedPost);
    }
  };

  if (loading) {
    return (
      <main className="container-fluid feed-soft-bg min-vh-100 pb-4">
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
      <main className="container-fluid feed-soft-bg min-vh-100 pb-4">
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
    <main className="container-fluid feed-soft-bg min-vh-100 pb-4">
      <AppToast toasts={toasts} onClose={removeToast} />
      <Navbar searchValue="" onSearchChange={() => {}} hideSearch={true} />
      <div className="container py-4">
        <div className="row g-4">
          {/* Left Sidebar */}
          <div className="col-12 col-md-3 d-none d-md-block">
            <div className="position-sticky" style={{ top: "85px" }}>
              <div className="mb-4">
                <button
                  className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2 rounded-pill fw-bold shadow-sm bg-white"
                  onClick={() => navigate(-1)}
                  style={{ transition: "all 0.2s" }}
                  onMouseOver={(e) => {
                    e.currentTarget.classList.replace(
                      "btn-outline-secondary",
                      "btn-secondary",
                    );
                    e.currentTarget.classList.replace("bg-white", "text-white");
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.classList.replace(
                      "btn-secondary",
                      "btn-outline-secondary",
                    );
                    e.currentTarget.classList.add("bg-white");
                    e.currentTarget.classList.remove("text-white");
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px" }}
                  >
                    arrow_back
                  </span>
                  Back to Feed
                </button>
              </div>
              <LeftSidebar />
            </div>
          </div>

          {/* Main Feed Content */}
          <div className="col-12 col-md-6">
            <div className="mb-3 d-md-none">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => navigate(-1)}
              >
                &larr; Back to Feed
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
                autoFocusInput={location.state?.focusCommentInput}
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
