import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { aiSearchAppData } from "../services/api-client";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";

const AISearchWidget: React.FC = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a prompt first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const response = await aiSearchAppData(query.trim());
      setResult(response.data.result);
    } catch (error: unknown) {
      setError(
        getUserFriendlyApiError(error, "Failed to search app data with AI."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm rounded-5 ai-widget-card">
      <div className="card-body p-4">
        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
          <Sparkles size={18} strokeWidth={2.2} className="text-primary" />
          AI App Data Search
        </h5>

        <textarea
          className="form-control rounded-4 mb-3 app-scrollbar ai-assistant-prompt"
          rows={4}
          placeholder="Ask about posts, users, comments..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <button
          type="button"
          className="btn btn-primary w-100 rounded-pill"
          disabled={loading}
          onClick={handleSearch}
        >
          {loading ? (
            <span className="d-inline-flex align-items-center gap-2">
              <span className="spinner-border spinner-border-sm" />
              Searching...
            </span>
          ) : (
            "Ask AI"
          )}
        </button>

        {error && <p className="text-danger small mt-2 mb-0">{error}</p>}

        {result && (
          <div className="mt-3 bg-white p-3 rounded-4 border">
            <strong>AI Answer:</strong>
            <div className="mt-2">{result}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISearchWidget;
