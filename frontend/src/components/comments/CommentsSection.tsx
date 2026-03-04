import { useEffect, useState, useMemo, useRef } from "react";
import apiClient from "../../services/api-client";
import type { Comment, CommentTreeItem } from "../../types/models";
import { getStoredSessionUser } from "../../utils/sessionUser";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../../utils/photoUtils";
import CommentItem from "./CommentItem";
import Swal from "sweetalert2";

interface CommentsSectionProps {
  postId: string;
  postAuthorId: string;
  onCommentsChange?: (count: number) => void;
  autoFocusInput?: boolean;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({
  postId,
  postAuthorId,
  onCommentsChange,
  autoFocusInput,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mainInputRef = useRef<HTMLInputElement>(null);

  const currentUser = getStoredSessionUser();

  const currentUserPhoto = currentUser
    ? normalizePhotoUrl(currentUser.photoUrl)
    : defaultUserPhotoUrl;

  useEffect(() => {
    const controller = new AbortController();

    const fetchComments = async () => {
      try {
        const { data } = await apiClient.get<Comment[]>(
          `/comment/?post=${postId}`,
          {
            signal: controller.signal,
          },
        );
        setComments(data);
        setError("");
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.name === "CanceledError" ||
            err.message === "canceled" ||
            controller.signal.aborted)
        ) {
          return;
        }
        setError("Failed to fetch comments.");
      } finally {
        setLoading(false);
      }
    };

    fetchComments();

    return () => {
      controller.abort();
    };
  }, [postId]);

  useEffect(() => {
    if (onCommentsChange) {
      onCommentsChange(comments.length);
    }
  }, [comments, onCommentsChange]);

  useEffect(() => {
    if (autoFocusInput && !loading && mainInputRef.current) {
      setTimeout(() => {
        mainInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        mainInputRef.current?.focus();
      }, 100);
    }
  }, [autoFocusInput, loading]);

  const tree = useMemo(() => {
    const map = new Map<string, CommentTreeItem>();
    const roots: CommentTreeItem[] = [];

    // Initialize map
    comments.forEach((c) => {
      map.set(c._id, { ...c, replies: [] });
    });

    // Build tree
    comments.forEach((c) => {
      const node = map.get(c._id);
      if (!node) return;

      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort by createdAt - used for comments
    const sortByDateDesc = (a: CommentTreeItem, b: CommentTreeItem) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime();

    roots.sort(sortByDateDesc);

    // Recursively sort replies desc (newest on top)
    const sortReplies = (items: CommentTreeItem[]) => {
      items.sort(sortByDateDesc);
      items.forEach((item) => sortReplies(item.replies));
    };
    roots.forEach((comment) => sortReplies(comment.replies));

    return roots;
  }, [comments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await apiClient.post<Comment>("/comment", {
        postId,
        content: newComment,
      });
      setComments((prev) => [data, ...prev]);
      setNewComment("");
      mainInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      alert("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyPosted = (newReply: Comment) => {
    setComments((prev) => [...prev, newReply]);
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    try {
      await apiClient.put(`/comment/${commentId}`, { content: newContent });
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId ? { ...c, content: newContent } : c,
        ),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to edit comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const result = await Swal.fire({
      title: "Delete comment?",
      text: "This action cannot be undone. All replies will also be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc3545",
    });

    if (!result.isConfirmed) return;

    try {
      await apiClient.delete(`/comment/${commentId}`);
      setComments((prev) => {
        const idsToRemove = new Set<string>();
        idsToRemove.add(commentId);
        let added = true;
        while (added) {
          added = false;
          for (const c of prev) {
            if (
              c.parentId &&
              idsToRemove.has(c.parentId) &&
              !idsToRemove.has(c._id)
            ) {
              idsToRemove.add(c._id);
              added = true;
            }
          }
        }
        return prev.filter((c) => !idsToRemove.has(c._id));
      });
    } catch (err) {
      console.error(err);
      alert("Failed to delete comment");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div
          className="spinner-border text-primary spinner-border-sm"
          role="status"
        >
          <span className="visually-hidden">Loading comments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-danger my-3">{error}</div>;
  }

  return (
    <div>
      <form
        onSubmit={handlePostComment}
        className="mb-4 d-flex align-items-start gap-2"
      >
        <img
          src={currentUserPhoto}
          alt="Avatar"
          className="rounded-circle"
          style={{ width: "40px", height: "40px", objectFit: "cover" }}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={(event) => {
            const element = event.currentTarget;
            if (element.src !== defaultUserPhotoUrl) {
              element.src = defaultUserPhotoUrl;
            }
          }}
        />
        <div className="flex-grow-1">
          <input
            ref={mainInputRef}
            type="text"
            className="form-control rounded-pill bg-light border-0 px-3"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary rounded-pill px-3"
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </form>

      <div className="comments-list">
        {tree.length === 0 ? (
          <p className="text-muted text-center py-4">
            No comments yet. Be the first to reply!
          </p>
        ) : (
          tree.map((node) => (
            <CommentItem
              key={node._id}
              comment={node}
              postId={postId}
              postAuthorId={postAuthorId}
              onReplyPosted={handleReplyPosted}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CommentsSection;
