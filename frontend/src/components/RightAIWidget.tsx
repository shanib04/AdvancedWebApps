import { useState } from "react";
import apiClient from "../services/api-client";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";

type InitialDraftPayload = {
  text: string;
  keyword: string;
  images: string[];
  includeImagesRequested: boolean;
};

interface RightAIWidgetProps {
  onInitialDraftGenerated: (payload: InitialDraftPayload) => void;
}

function RightAIWidget({ onInitialDraftGenerated }: RightAIWidgetProps) {
  const [prompt, setPrompt] = useState("");
  const [includeImages, setIncludeImages] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt first.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/api/ai/generateInitialDraft", {
        prompt: prompt.trim(),
        includeImages,
      });

      const generatedText = response.data?.text ?? "";
      const keyword = response.data?.keyword ?? "";
      const images = Array.isArray(response.data?.images)
        ? response.data.images
        : [];

      onInitialDraftGenerated({
        text: generatedText,
        keyword,
        images,
        includeImagesRequested: includeImages,
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
      setPrompt("");
    } catch (error: unknown) {
      setError(getUserFriendlyApiError(error, "Failed to generate AI text."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="position-sticky" style={{ top: "90px" }}>
      <div className="card border-0 shadow-sm rounded-5 ai-widget-card">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-3">✨ AI Post Assistant</h5>
          <textarea
            className="form-control rounded-4 mb-3"
            rows={4}
            placeholder="What should the AI write about?"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />

          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="include-ai-images"
              checked={includeImages}
              onChange={(event) => setIncludeImages(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="include-ai-images">
              Include images from the internet
            </label>
          </div>

          <button
            type="button"
            className="btn btn-primary w-100 rounded-pill"
            disabled={isLoading}
            onClick={handleGenerate}
          >
            {isLoading ? (
              <span className="d-inline-flex align-items-center gap-2">
                <span className="spinner-border spinner-border-sm" />
                Generating...
              </span>
            ) : (
              "Generate Post"
            )}
          </button>

          {error && <p className="text-danger small mt-2 mb-0">{error}</p>}
        </div>
      </div>
    </aside>
  );
}

export default RightAIWidget;
