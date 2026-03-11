import mongoose from "mongoose";
import { StoredDocumentAsset } from "../models/StoredDocumentAsset.model.js";
import { createServiceUnavailableError } from "../utils/errors.js";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

const sanitizeFileName = (value) =>
  String(value || "file")
    .replace(/[^\w.-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);

const assertDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    throw createServiceUnavailableError("MongoDB is not connected for document storage.");
  }
};

const normalizeStoragePath = (value = "") => String(value || "").trim();

const isValidStoragePath = (value = "") =>
  mongoose.Types.ObjectId.isValid(normalizeStoragePath(value));

export const uploadFileBuffer = async ({
  ownerUserId,
  originalName,
  mimeType,
  buffer
}) => {
  assertDatabaseReady();

  const normalizedBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
  const storedAsset = await StoredDocumentAsset.create({
    ownerUserId: String(ownerUserId || "").trim(),
    fileName: String(originalName || "").trim() || "file",
    contentType: String(mimeType || "").trim() || DEFAULT_CONTENT_TYPE,
    size: normalizedBuffer.length,
    buffer: normalizedBuffer
  });

  return {
    storageProvider: "mongodb",
    storagePath: String(storedAsset._id),
    size: storedAsset.size,
    contentType: storedAsset.contentType
  };
};

export const getStoredFileAsset = async (storagePath) => {
  assertDatabaseReady();

  if (!isValidStoragePath(storagePath)) {
    return null;
  }

  return StoredDocumentAsset.findById(normalizeStoragePath(storagePath));
};

export const deleteStorageObject = async (storagePath) => {
  assertDatabaseReady();

  if (!isValidStoragePath(storagePath)) {
    return false;
  }

  try {
    await StoredDocumentAsset.findByIdAndDelete(normalizeStoragePath(storagePath));
    return true;
  } catch (error) {
    console.error("documents-service storage delete failed:", error.message);
    return false;
  }
};

const getRequestOrigin = (req) => {
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").trim();
  const host = forwardedHost || String(req.get("host") || "").trim();
  if (!host) {
    return "";
  }

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").trim();
  const protocol = forwardedProto || req.protocol || "http";
  return `${protocol}://${host}`;
};

export const createSignedDownloadUrl = async ({ req, documentId }) => {
  const downloadPath = `/api/v1/documents/${encodeURIComponent(
    String(documentId || "").trim()
  )}/download`;
  const origin = getRequestOrigin(req);

  return {
    url: origin ? `${origin}${downloadPath}` : downloadPath,
    expiresAt: null
  };
};

export const getDownloadResponseHeaders = ({ fileName, contentType, size }) => ({
  "Content-Type": String(contentType || "").trim() || DEFAULT_CONTENT_TYPE,
  "Content-Length": String(Math.max(0, Number(size) || 0)),
  "Content-Disposition": `attachment; filename="${sanitizeFileName(fileName)}"`
});
