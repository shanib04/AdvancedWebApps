// displays an ai suggestion with apply/discard controls - renders nothing if text is empty
interface AiSuggestionBoxProps {
  text: string;
  onApply: () => void;
  onDiscard: () => void;
  wrapperClassName?: string;
}

function AiSuggestionBox({
  text,
  onApply,
  onDiscard,
  wrapperClassName = "",
}: AiSuggestionBoxProps) {
  if (!text) {
    return null;
  }

  const wrapperClasses = wrapperClassName
    ? `ai-suggestion-wrapper ${wrapperClassName}`
    : "ai-suggestion-wrapper";

  return (
    <div className={wrapperClasses}>
      <div className="mb-0 p-3 rounded-4 border shadow-sm ai-suggestion-box">
        <div className="small fw-semibold text-primary mb-2 d-flex align-items-center gap-2">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "18px" }}
          >
            tips_and_updates
          </span>
          AI suggestion
        </div>
        <div className="small text-body" style={{ whiteSpace: "pre-wrap" }}>
          {text}
        </div>
        <div className="d-flex gap-2 mt-2">
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-pill d-inline-flex align-items-center gap-1 px-3"
            onClick={onApply}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              done
            </span>
            Apply
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm rounded-pill d-inline-flex align-items-center gap-1 px-3"
            onClick={onDiscard}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              close
            </span>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

export default AiSuggestionBox;
