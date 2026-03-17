import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Post } from "../types/models";
import apiClient from "../services/api-client";
import {
  getAiImageSearchErrorMessage,
  getUserFriendlyApiError,
} from "../utils/getUserFriendlyApiError";

type InitialDraftPayload = {
  text: string;
  keyword: string;
  images: string[];
  includeImagesRequested: boolean;
};

type HomeDraftStudioProps = {
  initialDraft: InitialDraftPayload;
  onClose: () => void;
  onDraftPublished: (createdPost: Post) => void;
  onActionSuccess: (message: string) => void;
  onActionFailed: (message: string) => void;
};

function HomeDraftStudio({
  initialDraft,
  onClose,
  onDraftPublished,
  onActionSuccess,
  onActionFailed,
}: HomeDraftStudioProps) {
  const [draftText, setDraftText] = useState("");
  const [refineInstruction, setRefineInstruction] = useState("");
  const [draftKeyword, setDraftKeyword] = useState("");
  const [draftImageSearchText, setDraftImageSearchText] = useState("");
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [includeImagesRequested, setIncludeImagesRequested] = useState(true);
  const [isRefiningDraft, setIsRefiningDraft] = useState(false);
  const [isFetchingDraftImages, setIsFetchingDraftImages] = useState(false);
  const [isUploadingDraftImage, setIsUploadingDraftImage] = useState(false);
  const [isPublishingDraft, setIsPublishingDraft] = useState(false);
  const draftImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftText(initialDraft.text || "");
    setDraftKeyword(initialDraft.keyword || "");
    setDraftImageSearchText(initialDraft.keyword || "");
    setDraftImages(initialDraft.images || []);
    setSelectedImage(null);
    setManualImageUrl("");
    setRefineInstruction("");
    setIncludeImagesRequested(initialDraft.includeImagesRequested);
  }, [initialDraft]);

  const handleRefineDraft = async () => {
    if (!draftText.trim() || !refineInstruction.trim()) {
      onActionFailed("Draft text and instruction are required.");
      return;
    }

    setIsRefiningDraft(true);

    try {
      const response = await apiClient.post("/api/ai/refineText", {
        currentText: draftText,
        instruction: refineInstruction,
      });

      const updatedText = response.data?.text ?? "";
      if (updatedText) {
        setDraftText(updatedText);
      }
      setRefineInstruction("");
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to refine draft."));
    } finally {
      setIsRefiningDraft(false);
    }
  };

  const handleFetchMoreDraftImages = async () => {
    if (!draftImageSearchText.trim()) {
      onActionFailed("No keyword available for image search.");
      return;
    }

    setIsFetchingDraftImages(true);

    try {
      const response = await apiClient.post("/api/ai/getMoreImages", {
        keyword: draftImageSearchText.trim(),
      });

      const images = Array.isArray(response.data?.images)
        ? response.data.images
        : [];
      setDraftImages(images);
      setSelectedImage(null);
      setDraftKeyword(draftImageSearchText.trim());
    } catch (error: unknown) {
      onActionFailed(getAiImageSearchErrorMessage(error));
    } finally {
      setIsFetchingDraftImages(false);
    }
  };

  const handleUploadDraftImage = async (file?: File) => {
    if (!file) {
      return;
    }

    setIsUploadingDraftImage(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const uploadResponse = await apiClient.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const uploadedImageUrl = uploadResponse.data?.imageUrl;

      if (!uploadedImageUrl) {
        onActionFailed(
          "Image upload succeeded, but no image URL was returned.",
        );
        return;
      }

      setDraftImages((prevImages) =>
        prevImages.includes(uploadedImageUrl)
          ? prevImages
          : [uploadedImageUrl, ...prevImages],
      );
      setSelectedImage(uploadedImageUrl);
      onActionSuccess("Image uploaded and selected.");
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to upload image."));
    } finally {
      setIsUploadingDraftImage(false);
      if (draftImageInputRef.current) {
        draftImageInputRef.current.value = "";
      }
    }
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

    setDraftImages((prevImages) =>
      prevImages.includes(normalizedUrl)
        ? prevImages
        : [normalizedUrl, ...prevImages],
    );
    setSelectedImage(normalizedUrl);
    setManualImageUrl("");
    onActionSuccess("Image added to draft.");
  };

  const handlePublishDraft = async () => {
    if (!draftText.trim()) {
      onActionFailed("Draft text is required.");
      return;
    }

    setIsPublishingDraft(true);

    try {
      const createResponse = await apiClient.post("/post", {
        content: draftText,
        imageUrl: selectedImage ?? undefined,
      });

      if (createResponse.data?._id) {
        onDraftPublished(createResponse.data as Post);
      }

      onActionSuccess("Draft published successfully.");
      onClose();
    } catch (error: unknown) {
      onActionFailed(
        getUserFriendlyApiError(error, "Failed to publish draft."),
      );
    } finally {
      setIsPublishingDraft(false);
    }
  };
  return (
    <div className="card p-4 shadow-sm border-0 rounded-4">
      <div className="d-flex flex-column gap-4">
        <div className="mb-4">
          <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
            {" "}
            <Sparkles size={18} strokeWidth={2.2} className="text-primary" />
            AI Post Editor
          </h5>
          <h6
            className="text-muted text-uppercase fw-bold mb-3"
            style={{ fontSize: "0.8rem" }}
          >
            1. Refine Your Message
          </h6>

          <textarea
            id="draftText"
            className="form-control bg-light border-0 p-3 rounded-3 mb-3 app-scrollbar"
            rows={5}
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
          />

          <div className="input-group mb-4">
            <input
              id="refineInstruction"
              type="text"
              className="form-control"
              placeholder="Make it more playful and concise"
              value={refineInstruction}
              onChange={(event) => setRefineInstruction(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={isRefiningDraft}
              onClick={handleRefineDraft}
            >
              {isRefiningDraft ? (
                <span className="d-inline-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm" />
                  Refining...
                </span>
              ) : (
                "Apply Polish"
              )}
            </button>
          </div>

          <hr className="text-muted opacity-25 mb-4" />
        </div>

        <div className="mb-4">
          <h6
            className="text-muted text-uppercase fw-bold mb-3"
            style={{ fontSize: "0.8rem" }}
          >
            2. Choose Media
          </h6>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <small className="text-muted">
              Last used: {draftKeyword || "-"}
            </small>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-12">
              <input
                type="file"
                accept="image/*"
                className="d-none"
                ref={draftImageInputRef}
                onChange={(event) =>
                  handleUploadDraftImage(event.target.files?.[0])
                }
              />
              <div className="d-flex align-items-center justify-content-md-end gap-2">
                <button
                  type="button"
                  className={`btn btn-light rounded-circle d-flex align-items-center justify-content-center p-2 icon-action shadow-sm ${
                    isUploadingDraftImage
                      ? "text-white bg-primary border-primary"
                      : "text-primary"
                  }`}
                  onClick={() => draftImageInputRef.current?.click()}
                  disabled={isUploadingDraftImage}
                  aria-label="Upload image"
                >
                  {isUploadingDraftImage ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <span className="material-symbols-outlined fs-5">
                      image
                    </span>
                  )}
                </button>
                <small className="text-muted mb-0">Upload Your Image</small>
              </div>
            </div>
          </div>

          <div
            className="p-3 rounded-4 border position-relative tab-opacity-fade shadow-sm"
            style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
          >
            <label className="form-label fw-semibold text-primary d-flex align-items-center gap-2 mb-3">
              <span className="material-symbols-outlined">image_search</span>
              Find or Link Image
            </label>

            <div className="input-group mb-3 shadow-sm rounded-pill overflow-hidden bg-white">
              <span className="input-group-text bg-transparent border-0 ps-3 text-muted">
                <span className="material-symbols-outlined fs-5">search</span>
              </span>
              <input
                type="text"
                className="form-control border-0 shadow-none"
                placeholder="e.g. nature, coding, coffee"
                value={draftImageSearchText}
                onChange={(event) =>
                  setDraftImageSearchText(event.target.value)
                }
              />
              <button
                type="button"
                className="btn btn-primary px-4 fw-medium rounded-pill m-1"
                disabled={isFetchingDraftImages}
                onClick={handleFetchMoreDraftImages}
              >
                {isFetchingDraftImages ? "Fetching..." : "Fetch Images"}
              </button>
            </div>

            <div className="d-flex align-items-center mb-3">
              <span className="text-muted small px-3 fw-medium">OR</span>
            </div>

            <div className="input-group mb-4 shadow-sm rounded-pill overflow-hidden bg-white p-1">
              <span className="input-group-text bg-transparent text-muted border-0 ps-3">
                <span className="material-symbols-outlined fs-5">link</span>
              </span>
              <input
                type="url"
                className="form-control border-0 ps-1 shadow-none"
                placeholder="Paste an image URL here..."
                value={manualImageUrl}
                onChange={(event) => setManualImageUrl(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary px-4 fw-medium text-white rounded-pill"
                onClick={handleAddManualImageUrl}
              >
                Add URL
              </button>
            </div>

            {draftImages.length > 0 && (
              <div className="row g-2 mb-2">
                {draftImages.map((imageUrl) => (
                  <div className="col-4 col-sm-3" key={imageUrl}>
                    <img
                      src={imageUrl}
                      alt="AI suggestion"
                      className={`img-fluid w-100 rounded-3 ${
                        selectedImage === imageUrl
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
                        if (selectedImage !== imageUrl) {
                          event.currentTarget.style.opacity = "1";
                        }
                      }}
                      onMouseOut={(event) => {
                        if (selectedImage !== imageUrl) {
                          event.currentTarget.style.opacity = "0.75";
                        }
                      }}
                      onClick={() =>
                        setSelectedImage((prevSelected) =>
                          prevSelected === imageUrl ? null : imageUrl,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {draftImages.length === 0 ? (
              <small className="text-muted d-block mt-2">
                {includeImagesRequested
                  ? "No automatic images found. Try a different search term."
                  : "You chose not to fetch images automatically. You can fetch images now using search."}
              </small>
            ) : selectedImage ? (
              <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger rounded-pill px-3 fw-medium"
                  onClick={() => setSelectedImage(null)}
                >
                  Clear Selection
                </button>
                <small className="text-muted">
                  Image selected and ready for post.
                </small>
              </div>
            ) : (
              <small className="text-muted d-block mt-2">
                Select an image above or paste a URL to attach it to your post.
              </small>
            )}
          </div>

          <div className="d-flex justify-content-center gap-2 mt-3">
            <button
              type="button"
              className={`btn rounded-pill ${
                selectedImage === null ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setSelectedImage(null)}
            >
              No Image
            </button>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button
            type="button"
            className="btn btn-outline-secondary rounded-pill"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary rounded-pill px-4"
            disabled={isPublishingDraft}
            onClick={handlePublishDraft}
          >
            {isPublishingDraft ? (
              <span className="d-inline-flex align-items-center gap-2">
                <span className="spinner-border spinner-border-sm" />
                Publishing...
              </span>
            ) : (
              "Publish Draft"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomeDraftStudio;
