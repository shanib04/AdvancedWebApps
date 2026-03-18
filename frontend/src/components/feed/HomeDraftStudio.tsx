import { useEffect, useRef, useState } from "react";
import { useImagePicker } from "../../hooks/useImagePicker";
import apiClient from "../../services/api-client";
import type { Post } from "../../types/models";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import ImagePickerPanel from "../ai/ImagePickerPanel";

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
  const [includeImagesRequested, setIncludeImagesRequested] = useState(true);
  const [isRefiningDraft, setIsRefiningDraft] = useState(false);
  const [isUploadingDraftImage, setIsUploadingDraftImage] = useState(false);
  const [isPublishingDraft, setIsPublishingDraft] = useState(false);
  const draftImageInputRef = useRef<HTMLInputElement | null>(null);

  const {
    searchText: draftImageSearchText,
    setSearchText: setDraftImageSearchText,
    images: draftImages,
    setImages: setDraftImages,
    isFetching: isFetchingDraftImages,
    fetchImages: fetchDraftImages,
    selectedImage,
    setSelectedImage,
    manualUrl: manualImageUrl,
    setManualUrl: setManualImageUrl,
    addManualUrl: addDraftManualUrl,
  } = useImagePicker(onActionFailed);

  useEffect(() => {
    setDraftText(initialDraft.text || "");
    setDraftKeyword(initialDraft.keyword || "");
    setDraftImageSearchText(initialDraft.keyword || "");
    setDraftImages(initialDraft.images || []);
    setSelectedImage(null);
    setManualImageUrl("");
    setRefineInstruction("");
    setIncludeImagesRequested(initialDraft.includeImagesRequested);
  }, [
    initialDraft,
    setDraftImageSearchText,
    setDraftImages,
    setSelectedImage,
    setManualImageUrl,
  ]);

  // call AI refine endpoint to apply the user's style instruction to the draft text
  const handleRefineDraft = async () => {
    if (!draftText.trim() || !refineInstruction.trim()) {
      onActionFailed("Post text and instruction are required.");
      return;
    }

    setIsRefiningDraft(true);

    try {
      const response = await apiClient.post("/api/ai/refine-text", {
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

  // search unsplash for more images using the current keyword
  const handleFetchMoreDraftImages = async () => {
    if (!draftImageSearchText.trim()) {
      onActionFailed("No keyword available for image search.");
      return;
    }

    await fetchDraftImages(draftImageSearchText);
    setDraftKeyword(draftImageSearchText.trim());
  };

  // upload a local file and add it to the draft image pool
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

  // create the post with the current draft text and selected image, then notify parent
  const handlePublishDraft = async () => {
    if (!draftText.trim()) {
      onActionFailed("Post text is required.");
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

      onActionSuccess("Post published successfully.");
      onClose();
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to publish post."));
    } finally {
      setIsPublishingDraft(false);
    }
  };
  return (
    <div className="draft-studio-shell d-flex flex-column gap-3">
      <div className="draft-studio-block">
        <h5 className="fw-bold mb-2 d-flex align-items-center gap-2">
          AI Post Studio
        </h5>
        <p className="text-muted mb-3 draft-studio-subtitle">
          Fine-tune your text, pick media, and publish.
        </p>

        <div className="create-message-shell mb-3">
          <textarea
            id="draftText"
            className="form-control create-message-input px-3 py-2 fs-6 rounded-4 app-scrollbar"
            rows={5}
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
          />
        </div>

        <div className="input-group mb-1 draft-refine-group">
          <input
            id="refineInstruction"
            type="text"
            className="form-control"
            placeholder="Refine style, tone, or length"
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
      </div>

      <div className="draft-studio-block">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="text-muted text-uppercase fw-bold mb-0 draft-studio-label">
            Media
          </h6>

          <small className="text-muted">Last used: {draftKeyword || "-"}</small>
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
                  <span className="material-symbols-outlined fs-5">image</span>
                )}
              </button>
              <small className="text-muted mb-0">Upload image</small>
            </div>
          </div>
        </div>

        <ImagePickerPanel
          searchText={draftImageSearchText}
          onSearchChange={setDraftImageSearchText}
          images={draftImages}
          selectedImage={selectedImage}
          onSelectImage={setSelectedImage}
          manualUrl={manualImageUrl}
          onManualUrlChange={setManualImageUrl}
          onAddManualUrl={() =>
            addDraftManualUrl(manualImageUrl, () =>
              onActionSuccess("Image added to draft."),
            )
          }
          isFetching={isFetchingDraftImages}
          onFetch={handleFetchMoreDraftImages}
          onClose={() => undefined}
          showCloseButton={false}
        />

        {draftImages.length === 0 && (
          <small className="text-muted d-block mt-2">
            {includeImagesRequested
              ? "No automatic images found. Try a different search term."
              : "You chose not to fetch images automatically. You can fetch images now using search."}
          </small>
        )}

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

      <div className="d-flex justify-content-end gap-2 mt-1 pt-3 border-top">
        <button
          type="button"
          className="btn btn-outline-secondary rounded-pill"
          onClick={onClose}
        >
          Cancel
        </button>

        <button
          type="button"
          className="btn publish-btn text-white rounded-pill px-4 fw-semibold"
          disabled={isPublishingDraft}
          onClick={handlePublishDraft}
        >
          {isPublishingDraft ? (
            <span className="d-inline-flex align-items-center gap-2">
              <span className="spinner-border spinner-border-sm" />
              Publishing...
            </span>
          ) : (
            "Publish Post"
          )}
        </button>
      </div>
    </div>
  );
}

export default HomeDraftStudio;
