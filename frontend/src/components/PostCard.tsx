import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import type { Post, User } from "../types/models";
import apiClient from "../services/api-client";
import {
  getAiImageSearchErrorMessage,
  getUserFriendlyApiError,
} from "../utils/getUserFriendlyApiError";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../utils/photoUtils";
import { formatDateTimeLocal } from "../utils/dateUtils";
import { mergePostState } from "../utils/postState";
import AiSuggestionBox from "./AiSuggestionBox";

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
  const location = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isRefiningEditText, setIsRefiningEditText] = useState(false);
  const [editSuggestedText, setEditSuggestedText] = useState("");
  const [editedImageFile, setEditedImageFile] = useState<File | null>(null);
  const [editImageSearchText, setEditImageSearchText] = useState("");
  const [editFetchedImages, setEditFetchedImages] = useState<string[]>([]);
  const [selectedEditInternetImage, setSelectedEditInternetImage] = useState<
    string | null
  >(null);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [isFetchingEditImages, setIsFetchingEditImages] = useState(false);
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
  }, [post._id, location.pathname]);

  // Safely extract the populated user object from our strict Post model
  const userObj: User | null =
    typeof post.user === "object" && post.user !== null
      ? (post.user as User)
      : null;

  // Extract ID string if populated object wasn't returned
  const senderId: string =
    userObj?._id || (typeof post.user === "string" ? post.user : "");

  const isOwner = senderId === currentUserId;

  const senderName =
    userObj?.displayName || userObj?.username || "Unknown User";

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

      onPostUpdated(mergePostState(post, updateResponse.data));
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
        onPostUpdated(mergePostState(post, updatedPost));
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
      const response = await apiClient.post(`/post/${post._id}/save`);
      const updatedPost = response.data?.post as Post | undefined;

      if (updatedPost && updatedPost._id) {
        onPostUpdated(mergePostState(post, updatedPost));
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
      onActionFailed(getAiImageSearchErrorMessage(error));
    } finally {
      setIsFetchingEditImages(false);
    }
  };

  const handleRefineEditText = async () => {
    const currentText = editedContent.trim();

    if (!currentText) {
      return;
    }

    setIsRefiningEditText(true);

    try {
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

  const handleToggleEditInternetImageMode = () => {
    if (isEditInternetImageMode) {
      setIsClosingEditInternetPanel(true);

      if (closeEditPanelTimeoutRef.current) {
        window.clearTimeout(closeEditPanelTimeoutRef.current);
      }

      closeEditPanelTimeoutRef.current = window.setTimeout(() => {
        setIsEditInternetImageMode(false);
        setIsClosingEditInternetPanel(false);
        setEditFetchedImages([]);
        setSelectedEditInternetImage(null);
        setManualImageUrl("");
      }, 200);
      return;
    }

    setIsClosingEditInternetPanel(false);
    setIsEditInternetImageMode(true);
  };

  const handleAddManualImageUrl = () => {
    const normalizedUrl = manualImageUrl.trim();
    if (!normalizedUrl) {
      onActionFailed("Please enter an image URL.");
      return;
    }

    const isHttpUrl = /^https?:\/\//i.test(normalizedUrl);
    if (!isHttpUrl) {
      onActionFailed("Image URL must start with http:// or https://");
      return;
    }

    setEditFetchedImages((prevImages) =>
      prevImages.includes(normalizedUrl)
        ? prevImages
        : [normalizedUrl, ...prevImages],
    );
    setSelectedEditInternetImage(normalizedUrl);
    setManualImageUrl("");
    onActionSuccess("Image added to edit options.");
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
                  className={`p-3 rounded-4 border position-relative shadow-sm ${
                    isClosingEditInternetPanel
                      ? "tab-opacity-fade-out"
                      : "tab-opacity-fade"
                  }`}
                  style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
                >
                  <button
                    type="button"
                    className="btn-close position-absolute top-0 end-0 m-3"
                    aria-label="Close"
                    onClick={handleToggleEditInternetImageMode}
                  />
                  <label className="form-label fw-semibold text-primary d-flex align-items-center gap-2 mb-3">
                    <span className="material-symbols-outlined">
                      image_search
                    </span>
                    Find or Link Image
                  </label>

                  <div className="input-group mb-3 shadow-sm rounded-pill overflow-hidden bg-white">
                    <span className="input-group-text bg-transparent border-0 ps-3 text-muted">
                      <span className="material-symbols-outlined fs-5">
                        search
                      </span>
                    </span>
                    <input
                      type="text"
                      className="form-control border-0 shadow-none"
                      placeholder="e.g. sunset, coding, travel"
                      value={editImageSearchText}
                      onChange={(event) =>
                        setEditImageSearchText(event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-primary px-4 fw-medium rounded-pill m-1"
                      disabled={isFetchingEditImages}
                      onClick={handleFetchEditImages}
                    >
                      {isFetchingEditImages ? "Fetching..." : "Fetch Images"}
                    </button>
                  </div>

                  <div className="d-flex align-items-center mb-3">
                    <span className="text-muted small px-3 fw-medium">OR</span>
                  </div>

                  <div className="input-group mb-4 shadow-sm rounded-pill overflow-hidden bg-white p-1">
                    <span className="input-group-text bg-transparent text-muted border-0 ps-3">
                      <span className="material-symbols-outlined fs-5">
                        link
                      </span>
                    </span>
                    <input
                      type="url"
                      className="form-control border-0 ps-1 shadow-none"
                      placeholder="Paste an image URL here..."
                      value={manualImageUrl}
                      onChange={(event) =>
                        setManualImageUrl(event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-secondary px-4 fw-medium text-white rounded-pill"
                      onClick={handleAddManualImageUrl}
                    >
                      Add URL
                    </button>
                  </div>

                  {editFetchedImages.length > 0 && (
                    <div className="row g-2 mb-2">
                      {editFetchedImages.map((imageUrl) => (
                        <div className="col-4 col-sm-3" key={imageUrl}>
                          <img
                            src={imageUrl}
                            alt="Edit option"
                            className={`img-fluid w-100 rounded-3 ${
                              selectedEditInternetImage === imageUrl
                                ? "border border-4 border-primary shadow-sm"
                                : "opacity-75"
                            }`}
                            style={{
                              height: "90px",
                              objectFit: "cover",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onMouseOver={(event) => {
                              if (selectedEditInternetImage !== imageUrl) {
                                event.currentTarget.style.opacity = "1";
                              }
                            }}
                            onMouseOut={(event) => {
                              if (selectedEditInternetImage !== imageUrl) {
                                event.currentTarget.style.opacity = "0.75";
                              }
                            }}
                            onClick={() =>
                              setSelectedEditInternetImage(imageUrl)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedEditInternetImage ? (
                    <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger rounded-pill px-3 fw-medium"
                        onClick={() => setSelectedEditInternetImage(null)}
                      >
                        Clear Selection
                      </button>
                      <small className="text-muted">
                        Image selected and ready for post.
                      </small>
                    </div>
                  ) : (
                    <small className="text-muted d-block mt-2">
                      Select an image above or paste a URL to attach it to your
                      post.
                    </small>
                  )}
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
