interface ImagePickerPanelProps {
  // search text
  searchText: string;
  onSearchChange: (text: string) => void;

  // image selection
  images: string[];
  selectedImage: string | null;
  onSelectImage: (imageUrl: string | null) => void;

  // manual url input
  manualUrl: string;
  onManualUrlChange: (url: string) => void;
  onAddManualUrl: () => void;

  // loading and actions
  isFetching: boolean;
  onFetch: () => void;
  onClose: () => void;
  showCloseButton?: boolean;

}

// reusable image picker for post create and edit
export default function ImagePickerPanel({
  searchText,
  onSearchChange,
  images,
  selectedImage,
  onSelectImage,
  manualUrl,
  onManualUrlChange,
  onAddManualUrl,
  isFetching,
  onFetch,
  onClose,
  showCloseButton = true,
}: ImagePickerPanelProps) {
  return (
    <div
      className="p-3 rounded-4 border position-relative tab-opacity-fade shadow-sm"
      style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
    >
      {showCloseButton && (
        <button
          type="button"
          className="btn-close position-absolute top-0 end-0 m-3"
          aria-label="Close"
          onClick={onClose}
        />
      )}

      <label className="form-label fw-semibold text-primary d-flex align-items-center gap-2 mb-3">
        <span className="material-symbols-outlined">image_search</span>
        Find or Link Image
      </label>

      {/* search input */}
      <div className="input-group mb-3 shadow-sm rounded-pill overflow-hidden bg-white">
        <span className="input-group-text bg-transparent border-0 ps-3 text-muted">
          <span className="material-symbols-outlined fs-5">search</span>
        </span>
        <input
          type="text"
          className="form-control border-0 shadow-none"
          placeholder="e.g. nature, coding, coffee"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary px-4 fw-medium rounded-pill m-1"
          disabled={isFetching}
          onClick={onFetch}
        >
          {isFetching ? "Fetching..." : "Fetch Images"}
        </button>
      </div>

      <div className="d-flex align-items-center mb-3">
        <span className="text-muted small px-3 fw-medium">OR</span>
      </div>

      {/* manual url input */}
      <div className="input-group mb-4 shadow-sm rounded-pill overflow-hidden bg-white p-1">
        <span className="input-group-text bg-transparent text-muted border-0 ps-3">
          <span className="material-symbols-outlined fs-5">link</span>
        </span>
        <input
          type="url"
          className="form-control border-0 ps-1 shadow-none"
          placeholder="Paste an image URL here..."
          value={manualUrl}
          onChange={(e) => onManualUrlChange(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary px-4 fw-medium text-white rounded-pill"
          onClick={onAddManualUrl}
        >
          Add URL
        </button>
      </div>

      {/* image grid */}
      {images.length > 0 && (
        <div className="row g-2 mb-2">
          {images.map((imageUrl) => (
            <div className="col-4 col-sm-3" key={imageUrl}>
              <img
                src={imageUrl}
                alt="Search result"
                className={`img-fluid w-100 rounded-3 ${
                  selectedImage === imageUrl
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
                  if (selectedImage !== imageUrl) {
                    event.currentTarget.style.opacity = "1";
                  }
                }}
                onMouseOut={(event) => {
                  if (selectedImage !== imageUrl) {
                    event.currentTarget.style.opacity = "0.75";
                  }
                }}
                onClick={() =>
                  onSelectImage(imageUrl === selectedImage ? null : imageUrl)
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* selection status */}
      {selectedImage ? (
        <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top">
          <button
            type="button"
            className="btn btn-sm btn-outline-danger rounded-pill px-3 fw-medium"
            onClick={() => onSelectImage(null)}
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
  );
}
