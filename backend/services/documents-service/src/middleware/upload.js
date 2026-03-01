import multer from "multer";
import { env } from "../config/env.js";

const maxBytes = Math.max(1, env.uploadMaxMb) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxBytes
  }
});

export const singleDocumentUploadMiddleware = upload.single("file");
