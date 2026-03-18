import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Post } from "../../types/models";
import apiClient from "../../services/api-client";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import AiSuggestionBox from "../ai/AiSuggestionBox";
import UserAvatar from "../shared/ComposerAvatar";
import ImagePickerPanel from "../ai/ImagePickerPanel";
import { useImagePicker } from "../../hooks/useImagePicker";

const createPostSchema = z.object({
  text: z.string().min(1, "Post text is required."),
  image: z.instanceof(FileList).optional(),
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

interface CreatePostBoxProps {
  currentUserPhoto: string;
  onPostCreated: (post: Post) => void;
  onActionSuccess: (msg: string) => void;
  onActionFailed: (msg: string) => void;
}

// form for creating a new post
function CreatePostBox({
  currentUserPhoto,
  onPostCreated,
  onActionSuccess,
  onActionFailed,
}: CreatePostBoxProps) {
  const [isRefining, setIsRefining] = useState(false);
  const [suggestedText, setSuggestedText] = useState("");
  const [isCreateInternetImageMode, setIsCreateInternetImageMode] =
    useState(false);

  const {
    searchText: createImageSearchText,
    setSearchText: setCreateImageSearchText,
    images: createImages,
    isFetching: isFetchingCreateImages,
    fetchImages: fetchCreateImages,
    selectedImage: selectedCreateImage,
    setSelectedImage: setSelectedCreateImage,
    manualUrl: manualImageUrl,
    setManualUrl: setManualImageUrl,
    addManualUrl: addCreateManualUrl,
    reset: resetCreateImagePicker,
  } = useImagePicker(onActionFailed);

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
  });

  const imageRegister = register("image");
  const selectedFile = watch("image")?.[0];
  const selectedImagePreview = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : ""),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  // hit AI endpoint to improve post text
  const handleRefineText = async () => {
    const currentText = watch("text")?.trim() || "";

    if (!currentText) {
      return;
    }

    setIsRefining(true);

    try {
      // call AI service
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

      setSuggestedText(nextSuggestedText);
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to refine text."));
    } finally {
      setIsRefining(false);
    }
  };

  // fetch images from Unsplash based on search keyword
  const handleFetchCreateImages = async () => {
    if (!isCreateInternetImageMode) {
      return;
    }

    await fetchCreateImages(createImageSearchText);
  };

  // toggle between upload and search image modes
  const handleToggleCreateInternetImageMode = () => {
    setIsCreateInternetImageMode((prevMode) => {
      const nextMode = !prevMode;

      if (!nextMode) {
        resetCreateImagePicker();
      }

      return nextMode;
    });
  };

  // submit form - upload image if needed then create post
  const onSubmit = async (data: CreatePostFormData) => {
    try {
      let uploadedImageUrl: string | undefined =
        selectedCreateImage || undefined;
      const selectedImageFile = data.image?.[0];

      // handle local file upload
      if (selectedImageFile) {
        const formData = new FormData();
        formData.append("image", selectedImageFile);

        // upload to server
        const uploadResponse = await apiClient.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        uploadedImageUrl = uploadResponse.data?.imageUrl;
      }

      // create the post
      const createResponse = await apiClient.post("/post", {
        content: data.text,
        imageUrl: uploadedImageUrl,
      });

      if (createResponse.data?._id) {
        onPostCreated(createResponse.data as Post);
      }

      onActionSuccess("Post created successfully.");
      // reset form state
      setSuggestedText("");
      setIsCreateInternetImageMode(false);
      resetCreateImagePicker();
      reset();

      // clear file input
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    } catch (err: unknown) {
      onActionFailed(getUserFriendlyApiError(err, "Failed to create post."));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="d-flex gap-3 mb-2">
        <UserAvatar photoUrl={currentUserPhoto} />
        <div className="w-100">
          <div className="create-message-shell">
            <textarea
              id="text"
              className="form-control create-message-input px-3 py-2 fs-6 rounded-4"
              rows={selectedImagePreview || selectedCreateImage ? 2 : 3}
              placeholder="Share something with your community..."
              {...register("text")}
            />
          </div>
          <p
            className="text-danger small mt-1 mb-0 ms-2"
            style={{ minHeight: errors.text?.message ? "1.25rem" : "0.35rem" }}
          >
            {errors.text?.message || ""}
          </p>
        </div>
      </div>
      {suggestedText && (
        <div className="mb-4 mt-2 px-2">
          <AiSuggestionBox
            text={suggestedText}
            wrapperClassName="mt-1"
            onApply={() => {
              setValue("text", suggestedText, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setSuggestedText("");
            }}
            onDiscard={() => setSuggestedText("")}
          />
        </div>
      )}

      <input
        id="image"
        type="file"
        accept="image/*"
        className="d-none"
        {...imageRegister}
        ref={(element) => {
          imageRegister.ref(element);
          imageInputRef.current = element;
        }}
      />

      {(selectedImagePreview ||
        (selectedCreateImage && !isCreateInternetImageMode)) && (
        <div className="mb-3 ms-2 position-relative d-inline-block">
          <img
            src={selectedImagePreview || selectedCreateImage || ""}
            alt="Selected"
            className="preview-thumb rounded-4 shadow-sm"
            style={{
              width: "auto",
              height: "auto",
              maxHeight: "250px",
              maxWidth: "100%",
              objectFit: "contain",
            }}
          />
          <button
            type="button"
            className="btn btn-danger position-absolute top-0 start-100 translate-middle remove-image-btn shadow"
            onClick={() => {
              if (selectedImagePreview) {
                setValue("image", undefined);
                if (imageInputRef.current) {
                  imageInputRef.current.value = "";
                }
              } else {
                setSelectedCreateImage(null);
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

      {isCreateInternetImageMode && (
        <div className="mb-4 mt-2 px-2">
          <ImagePickerPanel
            searchText={createImageSearchText}
            onSearchChange={setCreateImageSearchText}
            images={createImages}
            selectedImage={selectedCreateImage}
            onSelectImage={setSelectedCreateImage}
            manualUrl={manualImageUrl}
            onManualUrlChange={setManualImageUrl}
            onAddManualUrl={() =>
              addCreateManualUrl(manualImageUrl, onActionSuccess)
            }
            isFetching={isFetchingCreateImages}
            onFetch={handleFetchCreateImages}
            onClose={handleToggleCreateInternetImageMode}
          />
        </div>
      )}

      <hr className="my-2 opacity-10 mx-2" style={{ borderColor: "#cbd5e1" }} />

      <div className="create-post-toolbar d-flex justify-content-between align-items-center mt-2 px-2 pb-1">
        <div className="create-post-tools d-flex gap-2">
          <button
            type="button"
            className={`btn btn-light rounded-circle d-flex align-items-center justify-content-center p-2 icon-action shadow-sm ${
              selectedFile
                ? "text-white bg-primary border-primary"
                : "text-primary"
            }`}
            title={
              isCreateInternetImageMode
                ? "Turn off internet image mode to upload from your device"
                : "Upload Photo"
            }
            onClick={() => imageInputRef.current?.click()}
            disabled={isCreateInternetImageMode}
          >
            <span className="material-symbols-outlined fs-5">image</span>
          </button>

          <button
            type="button"
            className={`btn btn-light rounded-circle d-flex align-items-center justify-content-center p-2 icon-action position-relative shadow-sm ${
              isCreateInternetImageMode ||
              (!selectedFile && selectedCreateImage)
                ? "text-white bg-primary border-primary"
                : "text-primary"
            }`}
            title={
              selectedFile
                ? "Remove local file first"
                : "Find on Web or Link URL"
            }
            onClick={handleToggleCreateInternetImageMode}
            disabled={Boolean(selectedFile)}
          >
            <span className="material-symbols-outlined fs-5">language</span>
            {selectedCreateImage &&
              !selectedFile &&
              !isCreateInternetImageMode && (
                <span className="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle">
                  <span className="visually-hidden">Image attached</span>
                </span>
              )}
          </button>

          <button
            type="button"
            className="btn btn-outline-primary btn-sm rounded-pill d-inline-flex align-items-center gap-2 ai-refine-btn ai-refine-btn-compact"
            onClick={handleRefineText}
            disabled={!watch("text")?.trim() || isRefining || isSubmitting}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px" }}
            >
              auto_awesome
            </span>
            {isRefining ? "Refining..." : "Refine text using AI"}
          </button>
        </div>

        <button
          type="submit"
          className="btn publish-btn text-white rounded-pill px-4 py-2 fw-semibold shadow"
          disabled={
            isSubmitting ||
            (!watch("text")?.trim() &&
              !selectedImagePreview &&
              !selectedCreateImage)
          }
        >
          {isSubmitting ? (
            <span className="d-inline-flex align-items-center gap-2">
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              />
              Publishing...
            </span>
          ) : (
            "Publish"
          )}
        </button>
      </div>
    </form>
  );
}

export default CreatePostBox;
