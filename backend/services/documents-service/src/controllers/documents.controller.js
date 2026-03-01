import {
  changeDocumentStatus,
  createDocument,
  deleteDocument,
  getDocumentById,
  getDocumentsByOwner,
  updateDocument
} from "../services/documents.service.js";
import {
  createSignedDownloadUrl,
  deleteStorageObject,
  uploadFileBuffer
} from "../services/firebase-storage.service.js";
import { getRequestActor, isPrivilegedActor } from "../utils/request-actor.js";
import {
  buildDocumentUpdatePayload,
  validateCreateDocumentPayload,
  validateStatusPayload,
  validateUploadBody
} from "../validation/documents.validation.js";
import { env } from "../config/env.js";

const requireActor = (req, res) => {
  const actor = getRequestActor(req);
  if (!actor.uid) {
    res.status(401).json({
      message: "Missing x-user-id header from authenticated gateway request"
    });
    return null;
  }

  return actor;
};

export const createOne = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const { errors, payload } = validateCreateDocumentPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const actorIsPrivileged = isPrivilegedActor(actor);
    if (!actorIsPrivileged && payload.ownerUserId !== actor.uid) {
      return res.status(403).json({
        message: "You can only create documents for your own account."
      });
    }

    const document = await createDocument(payload);

    return res.status(201).json(document);
  } catch (error) {
    return next(error);
  }
};

export const listByOwner = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const { ownerUserId } = req.params;
    const actorIsPrivileged = isPrivilegedActor(actor);

    if (!actorIsPrivileged && ownerUserId !== actor.uid) {
      return res.status(403).json({
        message: "You can only list your own documents."
      });
    }

    const documents = await getDocumentsByOwner(ownerUserId);
    return res.status(200).json(documents);
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const document = await getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const actorIsPrivileged = isPrivilegedActor(actor);
    if (!actorIsPrivileged && document.ownerUserId !== actor.uid) {
      return res.status(403).json({ message: "You cannot access this document." });
    }

    return res.status(200).json(document);
  } catch (error) {
    return next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    if (!isPrivilegedActor(actor)) {
      return res.status(403).json({
        message: "Only privileged users can change document status."
      });
    }

    const { status, error } = validateStatusPayload(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const updated = await changeDocumentStatus({
      id: req.params.id,
      status
    });

    if (!updated) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const putById = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const existing = await getDocumentById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Document not found" });
    }

    const actorIsPrivileged = isPrivilegedActor(actor);
    if (!actorIsPrivileged && existing.ownerUserId !== actor.uid) {
      return res.status(403).json({ message: "You cannot update this document." });
    }

    const { payload, errors } = buildDocumentUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one field to update: ownerUserId, fileName, category, className, tags, metadata, storageProvider, storagePath, status"
      });
    }

    if (
      !actorIsPrivileged &&
      (payload.ownerUserId !== undefined ||
        payload.storageProvider !== undefined ||
        payload.storagePath !== undefined ||
        payload.status !== undefined)
    ) {
      return res.status(403).json({
        message:
          "Only privileged users can update owner, storage metadata, or document status."
      });
    }

    const updated = await updateDocument({
      id: req.params.id,
      payload
    });

    if (!updated) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const removeById = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const existing = await getDocumentById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Document not found" });
    }

    const actorIsPrivileged = isPrivilegedActor(actor);
    if (!actorIsPrivileged && existing.ownerUserId !== actor.uid) {
      return res.status(403).json({ message: "You cannot delete this document." });
    }

    const deleted = await deleteDocument(req.params.id);

    if (
      deleted?.storageProvider === "firebase" &&
      deleted.storagePath &&
      env.deleteStorageObjectOnRecordDelete
    ) {
      await deleteStorageObject(deleted.storagePath);
    }

    return res.status(200).json({
      message: "Document deleted successfully.",
      id: deleted.id
    });
  } catch (error) {
    return next(error);
  }
};

export const uploadOne = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    if (!req.file) {
      return res.status(400).json({ message: "file is required (multipart field: file)" });
    }

    const { errors, payload } = validateUploadBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const ownerUserId = payload.ownerUserId || actor.uid;
    const actorIsPrivileged = isPrivilegedActor(actor);
    if (!actorIsPrivileged && ownerUserId !== actor.uid) {
      return res.status(403).json({
        message: "You can only upload documents for your own account."
      });
    }

    const uploadResult = await uploadFileBuffer({
      ownerUserId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer
    });

    const mergedMetadata = {
      ...payload.metadata,
      fileSize: uploadResult.size,
      contentType: uploadResult.contentType,
      uploadedBy: actor.uid,
      uploadedAt: new Date().toISOString()
    };

    const document = await createDocument({
      ownerUserId,
      fileName: req.file.originalname,
      category: payload.category,
      className: payload.className,
      tags: payload.tags,
      metadata: mergedMetadata,
      storageProvider: uploadResult.storageProvider,
      storagePath: uploadResult.storagePath,
      status: "processing"
    });

    return res.status(201).json(document);
  } catch (error) {
    return next(error);
  }
};

export const getDownloadUrl = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const document = await getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const actorIsPrivileged = isPrivilegedActor(actor);
    if (!actorIsPrivileged && document.ownerUserId !== actor.uid) {
      return res.status(403).json({ message: "You cannot download this document." });
    }

    if (document.storageProvider !== "firebase" || !document.storagePath) {
      return res.status(400).json({
        message: "This document does not have a Firebase storage object."
      });
    }

    const signed = await createSignedDownloadUrl({
      storagePath: document.storagePath,
      fileName: document.fileName
    });

    return res.status(200).json({
      documentId: document.id,
      downloadUrl: signed.url,
      expiresAt: signed.expiresAt
    });
  } catch (error) {
    return next(error);
  }
};
