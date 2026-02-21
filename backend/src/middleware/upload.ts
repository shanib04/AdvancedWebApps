import multer from "multer";
import path from "path";
import fs from "fs";

// Resolves the path relative to this file's location to ensure it always finds the 'public' folder
// regardless of where the server was started from.
const uploadDir = path.join(__dirname, "../../public/images");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// Automatically creates the target directory if it doesn't exist yet.
// The 'recursive: true' option ensures it creates parent folders too, preventing server crashes on the first upload.
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    // Generates a unique filename using a timestamp and a random number.
    // This prevents a user from accidentally overwriting someone else's profile picture if they both upload a file named "profile.jpg".
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  // Checking BOTH the mimetype and the extension prevents malicious users
  // from renaming a dangerous file (like a .exe script) to .jpg to bypass the filter.
  const isAllowedMime = ALLOWED_MIME_TYPES.has(file.mimetype);
  const isAllowedExtension = ALLOWED_EXTENSIONS.has(extension);

  if (isAllowedMime && isAllowedExtension) {
    // First argument is the error (null means no error).
    // Second argument is a boolean confirming we want to accept the file.
    cb(null, true);
    return;
  }

  // If the file fails the check, we pass an Error to the callback to reject the file and stop the upload.
  cb(new Error("Only JPG, PNG, and WEBP image files are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Prevents users from uploading multiple files at once in a single request field
  },
});

export default upload;
