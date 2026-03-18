import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { aiSearchAppData } from "../services/api-client";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";
import type { Post } from "../types/models";

const suggestionDefinitions = [
  {
    text: "Which user has the most posts?",
    score: ({ authorCount }: SuggestionSignals) => (authorCount > 1 ? 28 : 10),
  },
  {
    text: "Show me the most commented post.",
    score: ({ totalComments }: SuggestionSignals) =>
      totalComments > 0 ? 34 + totalComments : 6,
  },
  {
    text: "Who are the most active users?",
    score: ({ authorCount, postCount }: SuggestionSignals) =>
      authorCount > 1 ? 30 + Math.min(postCount, 10) : 8,
  },
  {
    text: "How many posts mention 'React'?",
    score: ({ reactPostCount }: SuggestionSignals) =>
      reactPostCount > 0 ? 38 + reactPostCount * 2 : 12,
  },
  {
    text: "List users who commented on my posts.",
    score: ({ hasCurrentUser, currentUserPostCount, totalComments }: SuggestionSignals) =>
      hasCurrentUser && currentUserPostCount > 0 && totalComments > 0 ? 32 : 7,
  },
  {
    text: "What are the top liked posts?",
    score: ({ totalLikes }: SuggestionSignals) =>
      totalLikes > 0 ? 33 + Math.min(totalLikes, 20) : 9,
  },
  {
    text: "Which topics are trending this week?",
    score: ({ postCount }: SuggestionSignals) => (postCount >= 4 ? 24 : 11),
  },
  {
    text: "Which users get the most comments per post?",
    score: ({ totalComments, authorCount }: SuggestionSignals) =>
      totalComments > 0 && authorCount > 1 ? 31 + totalComments : 10,
  },
] as const;

const VISIBLE_SUGGESTIONS = 3;

type AISearchWidgetProps = {
  posts?: Post[];
  currentUserId?: string;
};

type SuggestionSignals = {
  postCount: number;
  authorCount: number;
  totalComments: number;
  totalLikes: number;
  reactPostCount: number;
  hasCurrentUser: boolean;
  currentUserPostCount: number;
};

const AISearchWidget: React.FC<AISearchWidgetProps> = ({
  posts = [],
  currentUserId = "",
}) => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestionStart, setSuggestionStart] = useState(0);

  const signals = useMemo<SuggestionSignals>(() => {
    const authorIds = new Set<string>();
    let totalComments = 0;
    let totalLikes = 0;
    let reactPostCount = 0;
    let currentUserPostCount = 0;

    posts.forEach((post) => {
      const authorId =
        typeof post.user === "object" && post.user !== null ? post.user._id : post.user;

      if (authorId) {
        authorIds.add(authorId);
      }

      const commentsCount = Number(post.comments || 0);
      const likeCount = Number(post.likeCount || 0);

      totalComments += Number.isFinite(commentsCount) ? commentsCount : 0;
      totalLikes += Number.isFinite(likeCount) ? likeCount : 0;

      if ((post.content || "").toLowerCase().includes("react")) {
        reactPostCount += 1;
      }

      if (currentUserId && authorId === currentUserId) {
        currentUserPostCount += 1;
      }
    });

    return {
      postCount: posts.length,
      authorCount: authorIds.size,
      totalComments,
      totalLikes,
      reactPostCount,
      hasCurrentUser: Boolean(currentUserId),
      currentUserPostCount,
    };
  }, [posts, currentUserId]);

  const prioritizedSuggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const tokens = normalized.split(/\s+/).filter((token) => token.length >= 3);

    return [...suggestionDefinitions]
      .map((suggestion, index) => {
        const queryBoost = tokens.reduce((score, token) => {
          return suggestion.text.toLowerCase().includes(token) ? score + 18 : score;
        }, 0);

        return {
          text: suggestion.text,
          score: suggestion.score(signals) + queryBoost,
          index,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.index - right.index;
      })
      .map((suggestion) => suggestion.text);
  }, [query, signals]);

  const visibleSuggestions = useMemo(() => {
    if (prioritizedSuggestions.length <= VISIBLE_SUGGESTIONS) {
      return prioritizedSuggestions;
    }

    return Array.from({ length: VISIBLE_SUGGESTIONS }, (_, offset) => {
      const index = (suggestionStart + offset) % prioritizedSuggestions.length;
      return prioritizedSuggestions[index];
    });
  }, [prioritizedSuggestions, suggestionStart]);

  useEffect(() => {
    setSuggestionStart(0);
  }, [query]);

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
          AI Insights Assistant
        </h5>

        <textarea
          className="form-control rounded-4 mb-3 app-scrollbar ai-assistant-prompt"
          rows={4}
          placeholder="Ask about posts, users, comments..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <p className="small text-muted mb-2">Try a suggested question:</p>
        <div className="d-flex flex-wrap gap-2 mb-3">
          {visibleSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="btn btn-sm btn-outline-primary rounded-pill"
              onClick={() => {
                setQuery(suggestion);
                setError("");
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {prioritizedSuggestions.length > VISIBLE_SUGGESTIONS && (
          <button
            type="button"
            className="btn btn-link btn-sm p-0 mb-3"
            onClick={() => {
              setSuggestionStart((previous) =>
                (previous + VISIBLE_SUGGESTIONS) % prioritizedSuggestions.length,
              );
            }}
          >
            Show more ideas
          </button>
        )}

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
