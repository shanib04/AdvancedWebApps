import { useEffect, useRef, useState } from "react";
import type { Post } from "../hooks/usePosts";
import apiClient from "../services/api-client";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";

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
      onActionFailed(
        getUserFriendlyApiError(error, "Failed to fetch more images."),
      );
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

      const uploadedImageUrl =
        uploadResponse.data?.imageUrl ??
        uploadResponse.data?.photoUrl ??
        uploadResponse.data?.url;

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
          <h5 className="fw-bold mb-3">✨ AI Draft Studio</h5>
          <h6
            className="text-muted text-uppercase fw-bold mb-3"
            style={{ fontSize: "0.8rem" }}
          >
            1. Refine Your Message
          </h6>

          <textarea
            id="draftText"
            className="form-control bg-light border-0 p-3 rounded-3 mb-3"
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
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text">Search</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type what photos should show"
                  value={draftImageSearchText}
                  onChange={(event) =>
                    setDraftImageSearchText(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="col-12 col-md-6">
              <input
                type="file"
                accept="image/*"
                className="d-none"
                ref={draftImageInputRef}
                onChange={(event) =>
                  handleUploadDraftImage(event.target.files?.[0])
                }
              />
              <button
                type="button"
                className="btn btn-outline-primary w-100"
                onClick={() => draftImageInputRef.current?.click()}
                disabled={isUploadingDraftImage}
              >
                {isUploadingDraftImage ? (
                  <span className="d-inline-flex align-items-center gap-2">
                    <span className="spinner-border spinner-border-sm" />
                    Uploading...
                  </span>
                ) : (
                  "Upload Your Image"
                )}
              </button>
            </div>
          </div>

          <div className="input-group mb-3">
            <span className="input-group-text bg-white text-muted border-end-0">
              <span className="material-symbols-outlined fs-5">link</span>
            </span>
            <input
              type="url"
              className="form-control border-start-0 ps-0"
              placeholder="Paste an image URL here..."
              value={manualImageUrl}
              onChange={(event) => setManualImageUrl(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline-primary px-4"
              onClick={handleAddManualImageUrl}
            >
              Add
            </button>
          </div>

          <div className="row g-2 mb-3">
            {draftImages.length === 0 && (
              <div className="col-12">
                <p className="text-muted small mb-0">
                  {includeImagesRequested
                    ? "No automatic images found. Try a different search term."
                    : "You chose not to fetch images automatically. You can fetch images now using search."}
                </p>
              </div>
            )}
            {draftImages.map((imageUrl) => (
              <div className="col-6" key={imageUrl}>
                <img
                  src={imageUrl}
                  alt="AI suggestion"
                  className={`img-fluid w-100 rounded-3 ${
                    selectedImage === imageUrl
                      ? "border border-4 border-primary shadow"
                      : "opacity-75"
                  }`}
                  style={{
                    height: "150px",
                    cursor: "pointer",
                    objectFit: "cover",
                  }}
                  onClick={() => setSelectedImage(imageUrl)}
                />
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-center gap-2 mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill"
              disabled={isFetchingDraftImages}
              onClick={handleFetchMoreDraftImages}
            >
              {isFetchingDraftImages ? (
                <span className="d-inline-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm" />
                  Fetching images...
                </span>
              ) : (
                "Fetch Images Now"
              )}
            </button>

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
