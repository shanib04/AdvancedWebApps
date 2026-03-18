import { Sparkles } from "lucide-react";
import { useState } from "react";
import apiClient from "../../services/api-client";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import UserAvatar from "../shared/ComposerAvatar";

type InitialDraftPayload = {
  text: string;
  keyword: string;
  images: string[];
  includeImagesRequested: boolean;
};

interface RightAIWidgetProps {
  onInitialDraftGenerated: (payload: InitialDraftPayload) => void;
  inSection?: boolean;
  currentUserPhoto?: string;
}

function RightAIWidget({
  onInitialDraftGenerated,
  inSection = false,
  currentUserPhoto,
}: RightAIWidgetProps) {
  const [prompt, setPrompt] = useState("");
  const [includeImages, setIncludeImages] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // call AI generate post endpoint and pass the result up to the parent
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

  const content = (
    <>
      {inSection ? (
        <div className="px-1">
          <div className="d-flex gap-3 mb-3">
            <UserAvatar photoUrl={currentUserPhoto} />
            <div className="w-100">
              <div className="create-message-shell">
                <textarea
                  className="form-control create-message-input px-3 py-2 fs-6 rounded-4 app-scrollbar ai-assistant-prompt"
                  rows={3}
                  placeholder="What should the AI write about?"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2 px-1 pb-1">
            <div className="form-check form-switch mb-0 ms-1">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="include-ai-images"
                checked={includeImages}
                onChange={(event) => setIncludeImages(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="include-ai-images">
                Find images online
              </label>
            </div>

            <button
              type="button"
              className="btn publish-btn text-white rounded-pill px-4 py-2 fw-semibold shadow-sm"
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
          </div>

          {error && <p className="text-danger small mt-2 mb-0">{error}</p>}
        </div>
      ) : (
        <>
          <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
            <Sparkles size={18} strokeWidth={2.2} className="text-primary" />
            AI Post Assistant
          </h5>

          <textarea
            className="form-control rounded-4 mb-3 app-scrollbar ai-assistant-prompt"
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
              Find images online
            </label>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm w-100 rounded-pill"
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
        </>
      )}
    </>
  );

  if (inSection) {
    return <div>{content}</div>;
  }

  return (
    <div className="card border-0 shadow-sm rounded-5 ai-widget-card">
      <div className="card-body p-4">{content}</div>
    </div>
  );
}

export default RightAIWidget;
