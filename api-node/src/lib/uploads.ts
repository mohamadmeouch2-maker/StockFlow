import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { AppError } from "./errors";

// FR-17: product photos are saved as files in this folder and served at /uploads/...
// The folder is not committed to git: photos are data, like the database rows.
export const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "uploads");
const productDir = path.join(uploadRoot, "products");

// Only real photo formats. No SVG: it can contain scripts.
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const MAX_IMAGE_MB = 2;

export const productImageUpload = multer({
  storage: multer.diskStorage({
    // The folder is created the first time a photo is uploaded.
    destination: (_req, _file, cb) => fs.mkdir(productDir, { recursive: true }, (err) => cb(err, productDir)),
    // We choose the file name ourselves, so a user can never pick a path or a dangerous name.
    filename: (req, file, cb) => cb(null, `product-${req.params.id}-${Date.now()}.${extensions[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (extensions[file.mimetype]) return cb(null, true);
    cb(new AppError(400, "VALIDATION_ERROR", "Invalid input", [{ field: "image", message: "Use a JPG, PNG, WebP or GIF image" }]));
  },
}).single("image");

// Deletes an uploaded photo from disk. imageUrl looks like "/uploads/products/<file>".
export function deleteUpload(imageUrl: string | null | undefined) {
  if (!imageUrl?.startsWith("/uploads/products/")) return;
  fs.rm(path.join(productDir, path.basename(imageUrl)), { force: true }, () => {});
}
