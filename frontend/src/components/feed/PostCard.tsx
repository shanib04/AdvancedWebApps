import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import type { Post, User } from "../../types/models";
import apiClient from "../../services/api-client";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../../utils/photoUtils";
import { formatDateTimeLocal } from "../../utils/dateUtils";
import { mergePostState } from "../../utils/postState";
import AiSuggestionBox from "../ai/AiSuggestionBox";
import ImagePickerPanel from "../ai/ImagePickerPanel";
import { useImagePicker } from "../../hooks/useImagePicker";

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
  // navigation and ui state
  const navigate = useNavigate();
  const location = useLocation();

  // edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isRefiningEditText, setIsRefiningEditText] = useState(false);
  const [editSuggestedText, setEditSuggestedText] = useState("");
  const [editedImageFile, setEditedImageFile] = useState<File | null>(null);
  const [isEditInternetImageMode, setIsEditInternetImageMode] = useState(false);
  const [isClosingEditInternetPanel, setIsClosingEditInternetPanel] =
    useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSaved, setIsSaved] = useState(Boolean(post.isSaved));
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked));
  const [likesCount, setLikesCount] = useState(post.likeCount ?? 0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);
  const likeAnimationTimeoutRef = useRef<number | null>(null);
  const saveAnimationTimeoutRef = useRef<number | null>(null);
  const closeEditPanelTimeoutRef = useRef<number | null>(null);
  const postCardRef = useRef<HTMLElement | null>(null);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);

  const {
    searchText: editImageSearchText,
    setSearchText: setEditImageSearchText,
    images: editFetchedImages,
    isFetching: isFetchingEditImages,
    fetchImages: fetchEditImages,
    selectedImage: selectedEditInternetImage,
    setSelectedImage: setSelectedEditInternetImage,
    manualUrl: manualImageUrl,
    setManualUrl: setManualImageUrl,
    addManualUrl: addEditManualUrl,
    reset: resetEditImagePicker,
  } = useImagePicker(onActionFailed);

  const editedImagePreview = useMemo(
    () => (editedImageFile ? URL.createObjectURL(editedImageFile) : ""),
    [editedImageFile],
  );

  useEffect(() => {
    setIsLiked(Boolean(post.isLiked));
    setLikesCount(post.likeCount ?? 0);
    setIsSaved(Boolean(post.isSaved));
  }, [post.isLiked, post.likeCount, post.isSaved]);

  useEffect(() => {
    return () => {
      if (likeAnimationTimeoutRef.current) {
        window.clearTimeout(likeAnimationTimeoutRef.current);
      }
      if (saveAnimationTimeoutRef.current) {
        window.clearTimeout(saveAnimationTimeoutRef.current);
      }
      if (closeEditPanelTimeoutRef.current) {
        window.clearTimeout(closeEditPanelTimeoutRef.current);
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
    if (location.pathname.startsWith("/post/")) {
      return;
    }
    const lastViewed = sessionStorage.getItem("lastViewedPostId");
    if (lastViewed === post._id && postCardRef.current) {
      // poll scroll briefly for image layout shifts
      let attempts = 0;
      const interval = setInterval(() => {
        postCardRef.current?.scrollIntoView({
          behavior: "instant",
          block: "center",
        });
        attempts++;
        if (attempts >= 6) {
          // 6 tries x 150ms = 900ms
          clearInterval(interval);
        }
      }, 150);

      // fallback if first interval is delayed
      postCardRef.current?.scrollIntoView({
        behavior: "instant",
        block: "center",
      });

      sessionStorage.removeItem("lastViewedPostId");

      return () => clearInterval(interval);
    }
  }, [post._id, location.pathname]);

  // extract populated user object safely
  const userObj: User | null =
    typeof post.user === "object" && post.user !== null
      ? (post.user as User)
      : null;

  // extract user id if object is missing
  const senderId: string =
    userObj?._id || (typeof post.user === "string" ? post.user : "");

  const isOwner = senderId === currentUserId;

  const senderName =
    userObj?.displayName || userObj?.username || "Unknown User";

  const senderPhoto = userObj
    ? normalizePhotoUrl(userObj.photoUrl)
    : defaultUserPhotoUrl;

  // delete post with confirmation
  const handleDeletePost = async () => {
    // ask for confirmation
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
      // call delete api
      await apiClient.delete(`/post/${post._id}`);
      onPostDeleted(post._id);
      onActionSuccess("Post deleted successfully.");
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to delete post."));
    }
  };

  // save edited post with content and image
  const handleSaveEdit = async () => {
    setIsSavingEdit(true);

    try {
      let updatedImageUrl = selectedEditInternetImage ?? post.imageUrl;

      // reupload image if it changed
      if (editedImageFile) {
        const formData = new FormData();
        formData.append("image", editedImageFile);

        // upload new image
        const uploadResponse = await apiClient.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        updatedImageUrl = uploadResponse.data?.imageUrl;
      }

      // send updated post to server
      const updateResponse = await apiClient.put(`/post/${post._id}`, {
        content: editedContent,
        imageUrl: updatedImageUrl,
      });

      // update local state
      onPostUpdated(mergePostState(post, updateResponse.data));
      setIsEditing(false);
      setEditedImageFile(null);
      // clear edit form state
      if (editImageInputRef.current) {
        editImageInputRef.current.value = "";
      }
      // scroll back to updated post
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
      // reset image search state
      resetEditImagePicker();
      setIsEditInternetImageMode(false);
      onActionSuccess("Post updated successfully.");
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to update post."));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // toggle like with optimistic update
  const handleLike = async () => {
    // store previous state for rollback
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    const nextIsLiked = !previousIsLiked;
    const nextLikesCount = nextIsLiked
      ? previousLikesCount + 1
      : Math.max(previousLikesCount - 1, 0);

    // update ui immediately
    setIsLiked(nextIsLiked);
    setLikesCount(nextLikesCount);

    // show like animation
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
      // call like endpoint
      const response = await apiClient.post(`/post/${post._id}/like`);
      const updatedPost = response.data?.post as Post | undefined;

      // sync with server
      if (updatedPost && updatedPost._id) {
        onPostUpdated(mergePostState(post, updatedPost));
      }
    } catch (error: unknown) {
      // revert on error
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);

      onActionFailed(getUserFriendlyApiError(error, "Failed to update like."));
    }
  };

  // toggle save with optimistic update
  const handleSave = async () => {
    // store previous save state
    const previousIsSaved = isSaved;
    const nextIsSaved = !previousIsSaved;

    // update ui immediately
    setIsSaved(nextIsSaved);

    // show save animation
    if (nextIsSaved) {
      setShowSaveAnimation(true);

      if (saveAnimationTimeoutRef.current) {
        window.clearTimeout(saveAnimationTimeoutRef.current);
      }

      saveAnimationTimeoutRef.current = window.setTimeout(() => {
        setShowSaveAnimation(false);
      }, 360);
    } else {
      setShowSaveAnimation(false);
    }

    try {
      // call save endpoint
      const response = await apiClient.post(`/post/${post._id}/save`);
      const updatedPost = response.data?.post as Post | undefined;

      // sync with server
      if (updatedPost && updatedPost._id) {
        onPostUpdated(mergePostState(post, updatedPost));
      }
    } catch (error: unknown) {
      // revert on error
      setIsSaved(previousIsSaved);
      onActionFailed(getUserFriendlyApiError(error, "Failed to update save."));
    }
  };

  // fetch edit images from external api
  const handleFetchEditImages = async () => {
    if (!isEditInternetImageMode) {
      return;
    }

    if (!editImageSearchText.trim()) {
      onActionFailed("Please enter a keyword to fetch images.");
      return;
    }

    await fetchEditImages(editImageSearchText);
  };

  // refine edited post text with ai
  const handleRefineEditText = async () => {
    const currentText = editedContent.trim();

    if (!currentText) {
      return;
    }

    setIsRefiningEditText(true);

    try {
      // call ai refine endpoint
      const response = await apiClient.post("/api/ai/refine-text", {
        text: currentText,
      });

      const nextSuggestedText =
        typeof response.data?.text === "string"
          ? response.data.text.trim()
          : "";

      if (!nextSuggestedText) {
        onActionFailed("AI did not return a refined text suggestion.");
        return;
      }

      setEditSuggestedText(nextSuggestedText);
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to refine text."));
    } finally {
      setIsRefiningEditText(false);
    }
  };

  // toggle edit image search mode
  const handleToggleEditInternetImageMode = () => {
    if (isEditInternetImageMode) {
      // close panel with fade animation
      setIsClosingEditInternetPanel(true);

      if (closeEditPanelTimeoutRef.current) {
        window.clearTimeout(closeEditPanelTimeoutRef.current);
      }

      // clear state after animation
      closeEditPanelTimeoutRef.current = window.setTimeout(() => {
        setIsEditInternetImageMode(false);
        setIsClosingEditInternetPanel(false);
        resetEditImagePicker();
      }, 200);
      return;
    }

    setIsClosingEditInternetPanel(false);
    setIsEditInternetImageMode(true);
  };

  const handleAddManualImageUrl = () => {
    addEditManualUrl(manualImageUrl, () =>
      onActionSuccess("Image added to edit options."),
    );
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
                  {formatDateTimeLocal(post.createdAt)}
                </small>
              )}
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="mb-3">
            <textarea
              className="form-control mb-2 app-scrollbar"
              rows={3}
              value={editedContent}
              onChange={(event) => setEditedContent(event.target.value)}
            />

            {editSuggestedText && (
              <AiSuggestionBox
                text={editSuggestedText}
                wrapperClassName="mt-1 mb-2 px-1"
                onApply={() => {
                  setEditedContent(editSuggestedText);
                  setEditSuggestedText("");
                }}
                onDiscard={() => setEditSuggestedText("")}
              />
            )}

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
                  className="btn btn-danger position-absolute top-0 start-100 translate-middle remove-image-btn shadow"
                  onClick={() => {
                    setEditedImageFile(null);
                    if (editImageInputRef.current) {
                      editImageInputRef.current.value = "";
                    }
                  }}
                  aria-label="Remove selected image"
                >
                  <span className="material-symbols-outlined remove-image-icon">
                    close
                  </span>
                </button>
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center mt-2 px-1 pb-1">
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className={`btn btn-light rounded-circle d-flex align-items-center justify-content-center p-2 icon-action shadow-sm ${
                    editedImageFile
                      ? "text-white bg-primary border-primary"
                      : "text-primary"
                  }`}
                  onClick={() => editImageInputRef.current?.click()}
                  disabled={isEditInternetImageMode}
                >
                  <span className="material-symbols-outlined fs-5">image</span>
                </button>
                <button
                  type="button"
                  className={`btn btn-light rounded-circle d-flex align-items-center justify-content-center p-2 icon-action position-relative shadow-sm ${
                    isEditInternetImageMode ||
                    (!editedImageFile && selectedEditInternetImage)
                      ? "text-white bg-primary border-primary"
                      : "text-primary"
                  }`}
                  title={
                    editedImageFile
                      ? "Remove local file first"
                      : "Find on Web or Link URL"
                  }
                  onClick={handleToggleEditInternetImageMode}
                  disabled={Boolean(editedImageFile)}
                >
                  <span className="material-symbols-outlined fs-5">
                    language
                  </span>
                  {selectedEditInternetImage &&
                    !editedImageFile &&
                    !isEditInternetImageMode && (
                      <span className="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle">
                        <span className="visually-hidden">Image attached</span>
                      </span>
                    )}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm rounded-pill d-inline-flex align-items-center gap-2 ai-refine-btn"
                  onClick={handleRefineEditText}
                  disabled={
                    !editedContent.trim() || isRefiningEditText || isSavingEdit
                  }
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "18px" }}
                  >
                    auto_awesome
                  </span>
                  {isRefiningEditText ? "Refining..." : "Refine text using AI"}
                </button>
              </div>
            </div>

            {(isEditInternetImageMode || isClosingEditInternetPanel) && (
              <div className="mb-4 mt-2">
                <div
                  className={isClosingEditInternetPanel ? "tab-opacity-fade-out" : "tab-opacity-fade"}
                >
                  <ImagePickerPanel
                    searchText={editImageSearchText}
                    onSearchChange={setEditImageSearchText}
                    images={editFetchedImages}
                    selectedImage={selectedEditInternetImage}
                    onSelectImage={setSelectedEditInternetImage}
                    manualUrl={manualImageUrl}
                    onManualUrlChange={setManualImageUrl}
                    onAddManualUrl={handleAddManualImageUrl}
                    isFetching={isFetchingEditImages}
                    onFetch={handleFetchEditImages}
                    onClose={handleToggleEditInternetImageMode}
                  />
                </div>
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

        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="d-flex flex-wrap align-items-center gap-2">
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
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "18px",
                    color: isLiked ? "#dc2626" : "#6c757d",
                    fontVariationSettings: isLiked
                      ? '"FILL" 1, "wght" 700, "GRAD" 0, "opsz" 24'
                      : '"FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24',
                  }}
                >
                  favorite
                </span>
                <span>{likesCount}</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-sm rounded-pill icon-action d-flex align-items-center gap-1 text-secondary"
              onClick={() => {
                const postPath = `/post/${post._id}`;
                const fromPath = `${location.pathname}${location.search}`;

                if (location.pathname === postPath) {
                  window.dispatchEvent(
                    new CustomEvent("focusPostCommentInput", {
                      detail: { postId: post._id },
                    }),
                  );
                  return;
                }

                sessionStorage.setItem("lastViewedPostId", post._id);
                navigate(postPath, {
                  state: { focusCommentInput: true, fromPath },
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
                className={`material-symbols-outlined save-icon ${showSaveAnimation ? "save-icon-pop" : ""}`}
                style={{
                  fontSize: "18px",
                  color: isSaved ? "#2563eb" : "#6c757d",
                  fontVariationSettings: isSaved
                    ? '"FILL" 1, "wght" 700, "GRAD" 0, "opsz" 24'
                    : '"FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24',
                }}
              >
                bookmark
              </span>
            </button>
          </div>

          {isOwner && (
            <div className="d-flex flex-wrap align-items-center gap-2 ms-auto">
              {!isEditing && (
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

              {isEditing && (
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
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default PostCard;
