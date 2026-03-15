import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Post } from "../types/models";
import apiClient from "../services/api-client";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";
import { defaultUserPhotoUrl } from "../utils/photoUtils";

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

function CreatePostBox({
  currentUserPhoto,
  onPostCreated,
  onActionSuccess,
  onActionFailed,
}: CreatePostBoxProps) {
  const [createImageSearchText, setCreateImageSearchText] = useState("");
  const [createImages, setCreateImages] = useState<string[]>([]);
  const [selectedCreateImage, setSelectedCreateImage] = useState<string | null>(
    null,
  );
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [isFetchingCreateImages, setIsFetchingCreateImages] = useState(false);
  const [isCreateInternetImageMode, setIsCreateInternetImageMode] =
    useState(false);

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

  const handleFetchCreateImages = async () => {
    if (!isCreateInternetImageMode) {
      return;
    }

    if (!createImageSearchText.trim()) {
      onActionFailed("Please enter a keyword to fetch images.");
      return;
    }

    setIsFetchingCreateImages(true);

    try {
      const response = await apiClient.post("/api/ai/getMoreImages", {
        keyword: createImageSearchText.trim(),
      });

      const images = Array.isArray(response.data?.images)
        ? response.data.images
        : [];
      setCreateImages(images);
      setSelectedCreateImage(null);

      if (images.length === 0) {
        onActionFailed("No images found for this term. Try another keyword.");
      }
    } catch (error: unknown) {
      onActionFailed(getUserFriendlyApiError(error, "Failed to fetch images."));
    } finally {
      setIsFetchingCreateImages(false);
    }
  };

  const handleToggleCreateInternetImageMode = () => {
    setIsCreateInternetImageMode((prevMode) => {
      const nextMode = !prevMode;

      if (!nextMode) {
        setSelectedCreateImage(null);
        setCreateImages([]);
        setManualImageUrl("");
      }

      return nextMode;
    });
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

    setCreateImages((prevImages) =>
      prevImages.includes(normalizedUrl)
        ? prevImages
        : [normalizedUrl, ...prevImages],
    );
    setSelectedCreateImage(normalizedUrl);
    setManualImageUrl("");
    onActionSuccess("Image added to draft.");
  };

  const onSubmit = async (data: CreatePostFormData) => {
    try {
      let uploadedImageUrl: string | undefined =
        selectedCreateImage || undefined;
      const selectedImageFile = data.image?.[0];

      if (selectedImageFile) {
        const formData = new FormData();
        formData.append("image", selectedImageFile);

        const uploadResponse = await apiClient.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        uploadedImageUrl = uploadResponse.data?.imageUrl;
      }

      const createResponse = await apiClient.post("/post", {
        content: data.text,
        imageUrl: uploadedImageUrl,
      });

      if (createResponse.data?._id) {
        onPostCreated(createResponse.data as Post);
      }

      onActionSuccess("Post created successfully.");
      setCreateImageSearchText("");
      setCreateImages([]);
      setSelectedCreateImage(null);
      setIsCreateInternetImageMode(false);
      reset();

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
        <img
          src={currentUserPhoto}
          alt="Your avatar"
          className="avatar-soft shadow-sm bg-white"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={(event) => {
            const element = event.currentTarget;
            if (element.src !== defaultUserPhotoUrl) {
              element.src = defaultUserPhotoUrl;
            }
          }}
        />
        <div className="w-100">
          <div className="create-message-shell">
            <textarea
              id="text"
              className="form-control create-message-input px-3 py-2 fs-5 rounded-4"
              rows={selectedImagePreview || selectedCreateImage ? 2 : 3}
              placeholder="Share something with your community..."
              {...register("text")}
            />
          </div>
          <p
            className="text-danger small mt-1 mb-0 ms-2"
            style={{ minHeight: "1.25rem" }}
          >
            {errors.text?.message || "\u00A0"}
          </p>
        </div>
      </div>

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
          <div
            className="p-3 rounded-4 border position-relative tab-opacity-fade shadow-sm"
            style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
          >
            <button
              type="button"
              className="btn-close position-absolute top-0 end-0 m-3"
              aria-label="Close"
              onClick={handleToggleCreateInternetImageMode}
            />
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
                value={createImageSearchText}
                onChange={(event) =>
                  setCreateImageSearchText(event.target.value)
                }
              />
              <button
                type="button"
                className="btn btn-primary px-4 fw-medium rounded-pill m-1"
                disabled={isFetchingCreateImages}
                onClick={handleFetchCreateImages}
              >
                {isFetchingCreateImages ? "Fetching..." : "Fetch Images"}
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

            {createImages.length > 0 && (
              <div className="row g-2 mb-2">
                {createImages.map((imageUrl) => (
                  <div className="col-4 col-sm-3" key={imageUrl}>
                    <img
                      src={imageUrl}
                      alt="Internet option"
                      className={`img-fluid w-100 rounded-3 ${
                        selectedCreateImage === imageUrl
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
                        if (selectedCreateImage !== imageUrl) {
                          event.currentTarget.style.opacity = "1";
                        }
                      }}
                      onMouseOut={(event) => {
                        if (selectedCreateImage !== imageUrl) {
                          event.currentTarget.style.opacity = "0.75";
                        }
                      }}
                      onClick={() => setSelectedCreateImage(imageUrl)}
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedCreateImage ? (
              <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger rounded-pill px-3 fw-medium"
                  onClick={() => setSelectedCreateImage(null)}
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
        </div>
      )}

      <hr className="my-2 opacity-10 mx-2" style={{ borderColor: "#cbd5e1" }} />

      <div className="d-flex justify-content-between align-items-center mt-2 px-2 pb-1">
        <div className="d-flex gap-2">
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
