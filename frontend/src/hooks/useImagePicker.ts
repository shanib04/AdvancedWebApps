import { useState, useCallback } from "react";
import apiClient from "../services/api-client";
import { getAiImageSearchErrorMessage } from "../utils/getUserFriendlyApiError";

// manages image picker state and logic (search, manual url, selection)
export const useImagePicker = (onActionFailed: (msg: string) => void) => {
  // search state
  const [searchText, setSearchText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // selection state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  // fetch images from api
  const fetchImages = useCallback(
    async (keyword: string) => {
      if (!keyword.trim()) {
        onActionFailed("Please enter a keyword to fetch images.");
        return;
      }

      setIsFetching(true);

      try {
        const response = await apiClient.post("/api/ai/getMoreImages", {
          keyword: keyword.trim(),
        });

        const fetchedImages = Array.isArray(response.data?.images)
          ? response.data.images
          : [];
        setImages(fetchedImages);
        setSelectedImage(null);

        if (fetchedImages.length === 0) {
          onActionFailed(
            "No images found for this term. Try another keyword.",
          );
        }
      } catch (error: unknown) {
        onActionFailed(getAiImageSearchErrorMessage(error));
      } finally {
        setIsFetching(false);
      }
    },
    [onActionFailed],
  );

  // add manually entered url to selection
  const addManualUrl = useCallback(
    (url: string, onSuccess: (msg: string) => void) => {
      const normalizedUrl = url.trim();
      if (!normalizedUrl) {
        onActionFailed("Please enter an image URL.");
        return;
      }

      // validate http(s) url
      const isHttpUrl = /^https?:\/\//i.test(normalizedUrl);
      if (!isHttpUrl) {
        onActionFailed("Image URL must start with http:// or https://");
        return;
      }

      setImages((prevImages) =>
        prevImages.includes(normalizedUrl)
          ? prevImages
          : [normalizedUrl, ...prevImages],
      );
      setSelectedImage(normalizedUrl);
      setManualUrl("");
      onSuccess("Image added to post.");
    },
    [onActionFailed],
  );

  // reset state (e.g. when switching modes)
  const reset = useCallback(() => {
    setSearchText("");
    setImages([]);
    setSelectedImage(null);
    setManualUrl("");
  }, []);

  return {
    // search
    searchText,
    setSearchText,
    images,
    setImages,
    isFetching,
    fetchImages,
    // selection
    selectedImage,
    setSelectedImage,
    manualUrl,
    setManualUrl,
    addManualUrl,
    // control
    reset,
  };
};
