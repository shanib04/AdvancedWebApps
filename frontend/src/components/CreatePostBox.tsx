import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Post } from "../hooks/usePosts";
import apiClient from "../services/api-client";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";

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
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
  const defaultPhotoUrl = `${apiBaseUrl}/public/images/default-user.svg`;

  const [createImageSearchText, setCreateImageSearchText] = useState("");
  const [createImages, setCreateImages] = useState<string[]>([]);
  const [selectedCreateImage, setSelectedCreateImage] = useState<string | null>(
    null,
  );
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
      }

      return nextMode;
    });
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

        uploadedImageUrl =
          uploadResponse.data?.imageUrl ??
          uploadResponse.data?.photoUrl ??
          uploadResponse.data?.url;
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
      <div className="d-flex gap-3 mb-3">
        <img
          src={currentUserPhoto}
          alt="Your avatar"
          className="avatar-soft"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={(event) => {
            const element = event.currentTarget;
            if (element.src !== defaultPhotoUrl) {
              element.src = defaultPhotoUrl;
            }
          }}
        />
        <div className="w-100">
          <label htmlFor="text" className="form-label fw-semibold mb-1">
            What's on your mind?
          </label>
          <textarea
            id="text"
            className="form-control rounded-4 border-0 shadow"
            rows={4}
            placeholder="Share something with your community..."
            style={{ backgroundColor: "#f9fbff" }}
            {...register("text")}
          />
          <p
            className="text-danger small mt-1 mb-0"
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

      {selectedImagePreview && (
        <div className="mb-3 position-relative d-inline-block">
          <img
            src={selectedImagePreview}
            alt="Selected"
            className="preview-thumb rounded-4"
          />
          <button
            type="button"
            className="btn btn-danger position-absolute top-0 start-100 translate-middle remove-image-btn"
            onClick={() => {
              setValue("image", undefined);
              if (imageInputRef.current) {
                imageInputRef.current.value = "";
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

      <div className="d-flex justify-content-between align-items-center">
        <span
          title={
            isCreateInternetImageMode
              ? "Turn off 'Use image from internet' to import a photo from your files."
              : "Import a photo from your files."
          }
        >
          <button
            type="button"
            className="btn btn-outline-primary rounded-pill d-flex align-items-center gap-2"
            onClick={() => imageInputRef.current?.click()}
            disabled={isCreateInternetImageMode}
          >
            <span className="material-symbols-outlined">
              add_photo_alternate
            </span>
            Add Photo
          </button>
        </span>

        <button
          type="submit"
          className="btn publish-btn text-white rounded-pill px-4"
          disabled={isSubmitting}
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

      <div className="mt-3">
        <div
          className="form-check form-switch"
          title={
            selectedFile
              ? "Remove the selected file to enable internet image toggle."
              : "Toggle to search and select an internet image."
          }
        >
          <input
            className="form-check-input cursor-pointer"
            type="checkbox"
            role="switch"
            id="create-internet-image-toggle"
            checked={isCreateInternetImageMode}
            disabled={Boolean(selectedFile)}
            onChange={handleToggleCreateInternetImageMode}
          />
          <label
            className="form-check-label"
            htmlFor="create-internet-image-toggle"
          >
            Use image from internet
          </label>
        </div>

        {selectedFile ? (
          <small className="text-muted d-block mt-1">
            Remove your selected local file to enable internet image search.
          </small>
        ) : isCreateInternetImageMode ? (
          <small className="text-muted d-block mt-1">
            Internet image mode is on. Local photo import is disabled until you
            turn this off.
          </small>
        ) : null}
      </div>

      {isCreateInternetImageMode && (
        <div className="mt-3 p-3 rounded-4 border bg-light-subtle">
          <label className="form-label fw-semibold mb-2">
            Fetch images from the internet
          </label>

          <div className="input-group mb-2">
            <span className="input-group-text">Search</span>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. nature, coding, coffee"
              value={createImageSearchText}
              onChange={(event) => setCreateImageSearchText(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={isFetchingCreateImages}
              onClick={handleFetchCreateImages}
            >
              {isFetchingCreateImages ? "Fetching..." : "Fetch Images"}
            </button>
          </div>

          {createImages.length > 0 && (
            <div className="row g-2 mb-2">
              {createImages.map((imageUrl) => (
                <div className="col-6" key={imageUrl}>
                  <img
                    src={imageUrl}
                    alt="Internet option"
                    className={`img-fluid w-100 rounded-3 ${
                      selectedCreateImage === imageUrl
                        ? "border border-4 border-primary shadow"
                        : "opacity-75"
                    }`}
                    style={{
                      height: "120px",
                      objectFit: "cover",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedCreateImage(imageUrl)}
                  />
                </div>
              ))}
            </div>
          )}

          {selectedCreateImage ? (
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => setSelectedCreateImage(null)}
              >
                Clear Selected Internet Image
              </button>
              <small className="text-muted">
                Selected internet image will be used if no file is uploaded.
              </small>
            </div>
          ) : (
            <small className="text-muted">
              Pick an image above, or turn this off to keep file-only mode.
            </small>
          )}
        </div>
      )}
    </form>
  );
}

export default CreatePostBox;
