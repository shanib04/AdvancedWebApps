type GalleryColumnCounts = readonly [number, number, number];

type AuthPhotoGalleryProps = {
  images: readonly string[];
  counts: GalleryColumnCounts;
  canvasTransform?: string;
};

const DEFAULT_COLUMN_MARGINS: readonly string[] = ["1.75rem", "0", "3rem"];

const FLEX_BY_TILE_COUNT: Record<number, readonly number[]> = {
  1: [1],
  2: [1.45, 0.95],
  3: [1.35, 1, 1.6],
};

const toCount = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

// distribute images into three columns based on the counts array
const splitGalleryImages = (
  images: readonly string[],
  counts: GalleryColumnCounts,
): string[][] => {
  const safeCounts: GalleryColumnCounts = [
    toCount(counts[0]),
    toCount(counts[1]),
    toCount(counts[2]),
  ];

  const columns: string[][] = [[], [], []];
  let cursor = 0;

  for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
    const count = safeCounts[columnIndex];
    columns[columnIndex] = images.slice(cursor, cursor + count) as string[];
    cursor += count;
  }

  return columns;
};

function AuthPhotoGallery({
  images,
  counts,
  canvasTransform = "rotate(-4deg) scale(0.98)",
}: AuthPhotoGalleryProps) {
  const columns = splitGalleryImages(images, counts);

  return (
    <section className="login-gallery-panel col-lg-7 d-none d-lg-flex position-relative align-items-center justify-content-start pe-0 py-3 overflow-hidden">
      <div className="login-gallery-fade position-absolute top-0 end-0 h-100" />
      <div
        className="login-gallery-canvas position-relative w-100"
        style={{
          maxWidth: "none",
          width: "110%",
          marginLeft: "-3%",
          marginTop: "5vh",
          transform: canvasTransform,
          transformOrigin: "left center",
        }}
      >
        <div className="row g-3 h-100">
          {columns.map((column, columnIndex) => (
            <div
              key={columnIndex}
              className="col-4 d-flex flex-column gap-3 h-100"
              style={{
                marginTop: DEFAULT_COLUMN_MARGINS[columnIndex] ?? 0,
              }}
            >
              {column.map((imageUrl, tileIndex) => (
                <div
                  key={imageUrl}
                  className="w-100 rounded-4 shadow-sm flex-grow-1"
                  style={{
                    flex:
                      (FLEX_BY_TILE_COUNT[column.length] ?? [])[tileIndex] ?? 1,
                    minHeight: 0,
                    backgroundImage: `url(${imageUrl})`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                    boxShadow: "0 18px 36px rgba(15, 23, 42, 0.12)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AuthPhotoGallery;
