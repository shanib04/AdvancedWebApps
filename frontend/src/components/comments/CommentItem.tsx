import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/api-client";
import type { Comment, CommentTreeItem } from "../../types/models";
import { getStoredSessionUser } from "../../utils/sessionUser";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../../utils/photoUtils";

interface CommentItemProps {
  comment: CommentTreeItem;
  postId: string;
  postAuthorId: string;
  onReplyPosted: (newComment: Comment) => void;
  onEditComment: (commentId: string, newContent: string) => void;
  onDeleteComment: (commentId: string) => void;
  depth?: number;
  parentAuthorName?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  postAuthorId,
  onReplyPosted,
  onEditComment,
  onDeleteComment,
  depth = 0,
  parentAuthorName,
}) => {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const replyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showReplyBox && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [showReplyBox]);

  const currentUser = getStoredSessionUser();

  const currentUserPhoto = currentUser
    ? normalizePhotoUrl(currentUser.photoUrl)
    : defaultUserPhotoUrl;

  // Safely extract the user object from our string | User type union
  const userObj = typeof comment.user === "object" ? comment.user : null;

  const isAuthor = userObj?._id === postAuthorId;
  const isCommentOwner = userObj?._id === currentUser?._id;
  const canEdit = isCommentOwner;
  const canDelete = isCommentOwner || currentUser?._id === postAuthorId;

  const handleEditSubmit = () => {
    if (!editContent.trim()) return;
    onEditComment(comment._id, editContent);
    setIsEditing(false);
  };
  const username = userObj?.username || "Anonymous";
  const photoUrl = userObj?.photoUrl
    ? normalizePhotoUrl(userObj.photoUrl)
    : defaultUserPhotoUrl;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await apiClient.post<Comment>("/comment", {
        postId,
        content: replyContent,
        parentId: comment._id,
      });
      onReplyPosted(data);
      setReplyContent("");
      setShowReplyBox(false);
      setIsExpanded(true); // Automatically show replies when posting a new one
    } catch (err) {
      console.error(err);
      alert("Failed to post reply.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return new Intl.DateTimeFormat("en-IL", {
        timeZone: "Asia/Jerusalem",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
        hour12: false,
      }).format(new Date(dateString));
    } catch {
      return new Date(dateString).toLocaleDateString();
    }
  };

  // Calculate total nested replies to know when to show the "View X replies" button
  const getTotalSubRepliesCount = (node: CommentTreeItem): number => {
    if (!node.replies || node.replies.length === 0) return 0;
    return node.replies.reduce(
      (acc, child) => acc + 1 + getTotalSubRepliesCount(child),
      0,
    );
  };
  const totalSubReplies = getTotalSubRepliesCount(comment);

  const replies = comment.replies || [];

  return (
    <div className={depth === 0 ? "bg-light rounded-4 p-3 mb-4" : "mb-3"}>
      <div className="d-flex gap-2">
        <Link
          to={`/profile/${userObj?._id || "new"}`}
          className="flex-shrink-0"
        >
          <img
            src={photoUrl}
            alt={username}
            className="rounded-circle mt-1 border shadow-sm"
            style={{
              width: "36px",
              height: "36px",
              objectFit: "cover",
              backgroundColor: "#fff",
            }}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={(event) => {
              const element = event.currentTarget;
              if (element.src !== defaultUserPhotoUrl) {
                element.src = defaultUserPhotoUrl;
              }
            }}
          />
        </Link>
        <div className="d-flex flex-column flex-grow-1 min-w-0">
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="fw-bold" style={{ fontSize: "0.95rem" }}>
              <Link
                to={`/profile/${userObj?._id || "new"}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {username}
              </Link>
            </span>
            {isAuthor && (
              <span className="badge bg-primary-subtle text-primary rounded-pill">
                Author
              </span>
            )}
            <span className="text-muted ms-auto" style={{ fontSize: "0.8rem" }}>
              {formatDate(comment.createdAt)}
            </span>
          </div>

          {depth > 0 && parentAuthorName && (
            <div
              className="text-muted mb-1 d-flex align-items-center"
              style={{ fontSize: "0.85rem" }}
            >
              <span
                className="material-symbols-outlined me-1"
                style={{ fontSize: "14px" }}
              >
                reply
              </span>
              Replying to <strong className="ms-1">@{parentAuthorName}</strong>
            </div>
          )}

          {isEditing ? (
            <div className="mb-2 w-100 mt-2">
              <textarea
                className="form-control form-control-sm mb-2"
                rows={2}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm rounded-pill px-3"
                  onClick={handleEditSubmit}
                  disabled={!editContent.trim()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className="mb-0 text-dark mt-1"
              style={{ fontSize: "0.95rem", whiteSpace: "pre-wrap" }}
            >
              {comment.content}
            </p>
          )}

          <div className="d-flex flex-wrap gap-1 mt-2 ms-n2">
            <button
              onClick={() => setShowReplyBox(!showReplyBox)}
              className="btn btn-sm rounded-pill icon-action d-flex align-items-center gap-1 text-secondary"
              style={{ fontSize: "0.80rem" }}
            >
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontSize: "16px" }}
              >
                chat_bubble
              </span>
              Reply
            </button>
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-sm rounded-pill icon-action edit d-flex align-items-center gap-1 text-secondary"
                style={{ fontSize: "0.80rem" }}
              >
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontSize: "16px" }}
                >
                  edit
                </span>
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDeleteComment(comment._id)}
                className="btn btn-sm rounded-pill icon-action delete text-danger d-flex align-items-center gap-1"
                style={{ fontSize: "0.80rem" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  delete
                </span>
                Delete
              </button>
            )}
          </div>

          {showReplyBox && (
            <form onSubmit={handleReplySubmit} className="d-flex gap-2 mt-2">
              <img
                src={currentUserPhoto}
                alt="Avatar"
                className="rounded-circle border"
                style={{ width: "28px", height: "28px", objectFit: "cover" }}
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
                  ref={replyInputRef}
                  type="text"
                  className="form-control form-control-sm rounded-pill bg-white shadow-sm border border-secondary-subtle px-3 pt-1 pb-1"
                  placeholder={`Reply to ${username}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm"
                disabled={!replyContent.trim() || submitting}
              >
                {submitting ? "..." : "Send"}
              </button>
            </form>
          )}

          {replies.length > 0 && (
            <button
              className="btn btn-link btn-sm text-decoration-none p-0 mt-2 fw-semibold align-self-start text-primary"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded
                ? "Hide replies"
                : `View ${totalSubReplies} ${totalSubReplies === 1 ? "reply" : "replies"}`}
            </button>
          )}
        </div>
      </div>

      {isExpanded && replies.length > 0 && (
        <div className={depth === 0 ? "ms-4 ps-3 border-start mt-3" : "mt-3"}>
          {replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              postId={postId}
              postAuthorId={postAuthorId}
              onReplyPosted={onReplyPosted}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
              depth={depth + 1}
              parentAuthorName={username}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
