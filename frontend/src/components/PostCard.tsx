import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import type { Post, User } from "../types/models";
import apiClient from "../services/api-client";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../utils/photoUtils";

const israelDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface PostCardProps {
  post: Post;
  currentUserId: string;
  dynamicCommentCount?: number;
  onPostUpdated: (updatedPost: Post) => void;
  onPostDeleted: (postId: string) => void;
  onActionSuccess: (message: string) => void;
  onActionFailed: (message: string) => void;
}

function PostCard({
  post,
  currentUserId,
  dynamicCommentCount,
  onPostUpdated,
  onPostDeleted,
  onActionSuccess,
  onActionFailed,
}: PostCardProps) {
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [editedImageFile, setEditedImageFile] = useState<File | null>(null);
  const [editImageSearchText, setEditImageSearchText] = useState("");
  const [editFetchedImages, setEditFetchedImages] = useState<string[]>([]);
  const [selectedEditInternetImage, setSelectedEditInternetImage] = useState<
    string | null
  >(null);
  const [isFetchingEditImages, setIsFetchingEditImages] = useState(false);
  const [isEditInternetImageMode, setIsEditInternetImageMode] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSaved, setIsSaved] = useState(
    (post.savedBy ?? []).includes(currentUserId),
  );
  const [isLiked, setIsLiked] = useState(
    (post.likes ?? []).includes(currentUserId),
  );
  const [likesCount, setLikesCount] = useState((post.likes ?? []).length);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const likeAnimationTimeoutRef = useRef<number | null>(null);
  const postCardRef = useRef<HTMLElement | null>(null);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);

  const editedImagePreview = useMemo(
    () => (editedImageFile ? URL.createObjectURL(editedImageFile) : ""),
    [editedImageFile],
  );

  useEffect(() => {
    const likes = post.likes ?? [];
    const savedBy = post.savedBy ?? [];
    setIsLiked(likes.includes(currentUserId));
    setLikesCount(likes.length);
    setIsSaved(savedBy.includes(currentUserId));
  }, [post.likes, post.savedBy, currentUserId]);

  useEffect(() => {
    return () => {
      if (likeAnimationTimeoutRef.current) {
        window.clearTimeout(likeAnimationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (editedImagePreview) {
        URL.revokeObjectURL(editedImagePreview);
      }
    };
  }, [editedImagePreview]);

  useEffect(() => {
    if (!isEditing || !postCardRef.current) {
      return;
    }

    const headerOffset = 96;
    const cardTop =
      postCardRef.current.getBoundingClientRect().top +
      window.scrollY -
      headerOffset;

    window.scrollTo({
      top: Math.max(cardTop, 0),
      behavior: "smooth",
    });
  }, [isEditing]);

  useEffect(() => {
    const lastViewed = sessionStorage.getItem("lastViewedPostId");
    if (lastViewed === post._id && postCardRef.current) {
      // Images loading above this post can cause layout shifts, so we poll the scroll a few times
      let attempts = 0;
      const interval = setInterval(() => {
        postCardRef.current?.scrollIntoView({
          behavior: "instant",
          block: "center",
        });
        attempts++;
        if (attempts >= 6) {
          // 6 attempts * 150ms = 900ms
          clearInterval(interval);
        }
      }, 150);

      // Fallback in case first interval waits too long
      postCardRef.current?.scrollIntoView({
        behavior: "instant",
        block: "center",
      });

      sessionStorage.removeItem("lastViewedPostId");

      return () => clearInterval(interval);
    }
  }, [post._id]);

  // Safely extract the populated user object from our strict Post model
  const userObj: User | null =
    typeof post.user === "object" && post.user !== null
      ? (post.user as User)
      : null;

  // Extract ID string if populated object wasn't returned
  const senderId: string =
    userObj?._id || (typeof post.user === "string" ? post.user : "");

  const isOwner = senderId === currentUserId;

  const senderName = userObj?.username || "Unknown User";

  const senderPhoto = userObj
    ? normalizePhotoUrl(userObj.photoUrl)
    : defaultUserPhotoUrl;

  const handleDeletePost = async () => {
    const result = await Swal.fire({
      title: "Delete post?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc3545",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await apiClient.delete(`/post/${post._id}`);
      onPostDeleted(post._id);
      onActionSuccess("Post deleted successfully.");
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to delete post."));
    }
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);

    try {
      let updatedImageUrl = selectedEditInternetImage ?? post.imageUrl;

      if (editedImageFile) {
        const formData = new FormData();
        formData.append("image", editedImageFile);

        const uploadResponse = await apiClient.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        updatedImageUrl = uploadResponse.data?.imageUrl;
      }

      const updateResponse = await apiClient.put(`/post/${post._id}`, {
        content: editedContent,
        imageUrl: updatedImageUrl,
      });

      onPostUpdated(updateResponse.data);
      setIsEditing(false);
      setEditedImageFile(null);
      if (editImageInputRef.current) {
        editImageInputRef.current.value = "";
      }
      if (postCardRef.current) {
        const headerOffset = 96;
        const cardTop =
          postCardRef.current.getBoundingClientRect().top +
          window.scrollY -
          headerOffset;

        window.scrollTo({
          top: Math.max(cardTop, 0),
          behavior: "smooth",
        });
      }
      setEditImageSearchText("");
      setEditFetchedImages([]);
      setSelectedEditInternetImage(null);
      setIsEditInternetImageMode(false);
      onActionSuccess("Post updated successfully.");
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to update post."));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleLike = async () => {
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    const nextIsLiked = !previousIsLiked;
    const nextLikesCount = nextIsLiked
      ? previousLikesCount + 1
      : Math.max(previousLikesCount - 1, 0);

    setIsLiked(nextIsLiked);
    setLikesCount(nextLikesCount);

    if (nextIsLiked) {
      setShowLikeAnimation(true);

      if (likeAnimationTimeoutRef.current) {
        window.clearTimeout(likeAnimationTimeoutRef.current);
      }

      likeAnimationTimeoutRef.current = window.setTimeout(() => {
        setShowLikeAnimation(false);
      }, 1000);
    } else {
      setShowLikeAnimation(false);
    }

    try {
      const response = await apiClient.post(`/post/${post._id}/like`);
      const updatedPost = response.data?.post as Post | undefined;

      if (updatedPost && updatedPost._id) {
        // Keep the existing comment count when updating via like
        if (post.comments !== undefined && updatedPost.comments === undefined) {
          updatedPost.comments = post.comments;
        }
        onPostUpdated(updatedPost);
      }
    } catch (error: unknown) {
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);

      onActionFailed(getUserFriendlyApiError(error, "Failed to update like."));
    }
  };

  const handleSave = async () => {
    const previousIsSaved = isSaved;
    const nextIsSaved = !previousIsSaved;

    setIsSaved(nextIsSaved);

    try {
      const response = await apiClient.post(`/post/${post._id}/save`);
      const updatedPost = response.data?.post as Post | undefined;

      if (updatedPost && updatedPost._id) {
        // Keep the existing comment count when updating via save
        if (post.comments !== undefined && updatedPost.comments === undefined) {
          updatedPost.comments = post.comments;
        }
        onPostUpdated(updatedPost);
      }
    } catch (error: unknown) {
      setIsSaved(previousIsSaved);
      onActionFailed(getUserFriendlyApiError(error, "Failed to update save."));
    }
  };

  const handleFetchEditImages = async () => {
    if (!isEditInternetImageMode) {
      return;
    }

    if (!editImageSearchText.trim()) {
      onActionFailed("Please enter a keyword to fetch images.");
      return;
    }

    setIsFetchingEditImages(true);

    try {
      const response = await apiClient.post("/api/ai/getMoreImages", {
        keyword: editImageSearchText.trim(),
      });

      const images = Array.isArray(response.data?.images)
        ? response.data.images
        : [];

      setEditFetchedImages(images);
      setSelectedEditInternetImage(null);

      if (images.length === 0) {
        onActionFailed("No images found for this term. Try another keyword.");
      }
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to fetch images."));
    } finally {
      setIsFetchingEditImages(false);
    }
  };

  const handleToggleEditInternetImageMode = () => {
    setIsEditInternetImageMode((prevMode) => {
      const nextMode = !prevMode;

      if (!nextMode) {
        setEditFetchedImages([]);
        setSelectedEditInternetImage(null);
      }

      return nextMode;
    });
  };

  return (
    <article
      ref={postCardRef}
      className="card border-0 shadow-sm rounded-5 post-card-hover post-card-animate"
    >
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex align-items-center gap-3">
            <Link
              to={`/profile/${userObj ? userObj._id : "new"}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <img
                src={senderPhoto}
                alt={senderName}
                className="border rounded-circle"
                width={40}
                height={40}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(event) => {
                  const element = event.currentTarget;
                  if (element.src !== defaultUserPhotoUrl) {
                    element.src = defaultUserPhotoUrl;
                  }
                }}
                style={{
                  objectFit: "cover",
                  backgroundColor: "#fff",
                }}
              />
            </Link>
            <div>
              <h6 className="mb-0 fw-bold">
                <Link
                  to={`/profile/${userObj ? userObj._id : "new"}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {senderName}
                </Link>
              </h6>
              {post.createdAt && (
                <small className="text-muted">
                  {israelDateTimeFormatter.format(new Date(post.createdAt))}
                </small>
              )}
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="mb-3">
            <textarea
              className="form-control mb-2"
              rows={3}
              value={editedContent}
              onChange={(event) => setEditedContent(event.target.value)}
            />

            <input
              type="file"
              accept="image/*"
              className="d-none"
              ref={editImageInputRef}
              onChange={(event) => {
                const nextFile = event.target.files?.[0] || null;
                setEditedImageFile(nextFile);
              }}
            />

            {editedImagePreview && (
              <div className="mb-3 position-relative d-inline-block">
                <img
                  src={editedImagePreview}
                  alt="Selected for edit"
                  className="preview-thumb rounded-4"
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm rounded-circle position-absolute top-0 start-100 translate-middle py-1"
                  onClick={() => {
                    setEditedImageFile(null);
                    if (editImageInputRef.current) {
                      editImageInputRef.current.value = "";
                    }
                  }}
                  aria-label="Remove selected image"
                >
                  ×
                </button>
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center">
              <span
                title={
                  isEditInternetImageMode
                    ? "Turn off 'Use image from internet' to import a local file."
                    : "Import a photo from your files."
                }
              >
                <button
                  type="button"
                  className="btn btn-outline-primary rounded-pill d-flex align-items-center gap-2"
                  onClick={() => editImageInputRef.current?.click()}
                  disabled={isEditInternetImageMode}
                >
                  <span className="material-symbols-outlined">
                    add_photo_alternate
                  </span>
                  Add Photo
                </button>
              </span>
            </div>

            <div
              className="form-check form-switch mt-3"
              title={
                editedImageFile
                  ? "Remove the selected file to enable internet image toggle."
                  : "Toggle to search and select an internet image."
              }
            >
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id={`edit-internet-image-toggle-${post._id}`}
                checked={isEditInternetImageMode}
                disabled={Boolean(editedImageFile)}
                onChange={handleToggleEditInternetImageMode}
              />
              <label
                className="form-check-label"
                htmlFor={`edit-internet-image-toggle-${post._id}`}
              >
                Use image from internet
              </label>
            </div>

            {editedImageFile ? (
              <small className="text-muted d-block mt-1">
                Remove your selected local file to enable internet image search.
              </small>
            ) : isEditInternetImageMode ? (
              <small className="text-muted d-block mt-1">
                Internet image mode is on. Local file import is disabled until
                you turn this off.
              </small>
            ) : null}

            {isEditInternetImageMode && (
              <div className="mt-3 p-3 rounded-4 border bg-light-subtle">
                <label className="form-label fw-semibold mb-2">
                  Fetch images from the internet
                </label>

                <div className="input-group mb-2">
                  <span className="input-group-text">Search</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. sunset, coding, travel"
                    value={editImageSearchText}
                    onChange={(event) =>
                      setEditImageSearchText(event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={isFetchingEditImages}
                    onClick={handleFetchEditImages}
                  >
                    {isFetchingEditImages ? "Fetching..." : "Fetch Images"}
                  </button>
                </div>

                {editFetchedImages.length > 0 && (
                  <div className="row g-2 mb-2">
                    {editFetchedImages.map((imageUrl) => (
                      <div className="col-6" key={imageUrl}>
                        <img
                          src={imageUrl}
                          alt="Edit option"
                          className={`img-fluid w-100 rounded-3 ${
                            selectedEditInternetImage === imageUrl
                              ? "border border-4 border-primary shadow"
                              : "opacity-75"
                          }`}
                          style={{
                            height: "120px",
                            objectFit: "cover",
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedEditInternetImage(imageUrl)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {selectedEditInternetImage ? (
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setSelectedEditInternetImage(null)}
                    >
                      Clear Selected Internet Image
                    </button>
                    <small className="text-muted d-flex align-items-center">
                      Selected internet image will be used if no file is
                      uploaded.
                    </small>
                  </div>
                ) : (
                  <small className="text-muted">
                    Pick an image above, or turn this off to keep current/file
                    image.
                  </small>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="mb-3" style={{ whiteSpace: "pre-wrap" }}>
            {post.content}
          </p>
        )}

        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Post"
            className="img-fluid rounded-4 mb-3"
            style={{ objectFit: "contain", width: "100%", maxHeight: "none" }}
          />
        )}

        <div className="d-flex flex-wrap gap-2">
          <div className="position-relative">
            {showLikeAnimation && (
              <>
                <span className="material-symbols-outlined text-danger floating-heart floating-heart-1">
                  favorite
                </span>
                <span className="material-symbols-outlined text-danger floating-heart floating-heart-2">
                  favorite
                </span>
                <span className="material-symbols-outlined text-danger floating-heart floating-heart-3">
                  favorite
                </span>
              </>
            )}

            <button
              type="button"
              className="btn btn-sm rounded-pill icon-action like d-flex align-items-center gap-1"
              onClick={handleLike}
            >
              <span
                className={`material-symbols-outlined ${isLiked ? "text-danger" : "text-secondary"}`}
                style={{
                  fontSize: "18px",
                  color: isLiked ? "#dc3545" : undefined,
                }}
              >
                {isLiked ? "favorite" : "favorite_border"}
              </span>
              <span>{likesCount}</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm rounded-pill icon-action d-flex align-items-center gap-1 text-secondary"
            onClick={() => {
              sessionStorage.setItem("lastViewedPostId", post._id);
              navigate(`/post/${post._id}`, {
                state: { focusCommentInput: true },
              });
            }}
          >
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontSize: "18px" }}
            >
              chat_bubble
            </span>
            <span className="text-secondary">
              {dynamicCommentCount ?? post.comments ?? 0}
            </span>
          </button>

          <button
            type="button"
            className="btn btn-sm rounded-pill icon-action save d-flex align-items-center gap-1"
            onClick={handleSave}
          >
            <span
              className={`material-symbols-outlined ${isSaved ? "text-primary" : "text-secondary"}`}
              style={{
                fontSize: "18px",
                fontVariationSettings: isSaved
                  ? '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24'
                  : '"FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24',
              }}
            >
              bookmark
            </span>
          </button>

          {isOwner && !isEditing && (
            <button
              type="button"
              className="btn btn-sm rounded-pill icon-action edit d-flex align-items-center gap-1"
              onClick={() => setIsEditing(true)}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                edit
              </span>
              Edit
            </button>
          )}

          {isOwner && isEditing && (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-pill"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
              >
                {isSavingEdit ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-pill"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </>
          )}

          {isOwner && (
            <button
              type="button"
              className="btn btn-sm rounded-pill icon-action delete text-danger d-flex align-items-center gap-1"
              onClick={handleDeletePost}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                delete
              </span>
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default PostCard;
