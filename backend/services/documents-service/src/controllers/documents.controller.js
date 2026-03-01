import {
  changeDocumentStatus,
  createDocument,
  deleteDocument,
  getDocumentById,
  getDocumentsByOwner,
  updateDocument
} from "../services/documents.service.js";

export const createOne = async (req, res, next) => {
  try {
    const { ownerUserId, fileName, category, className, tags, metadata } = req.body;
    if (!ownerUserId || !fileName || !category) {
      return res.status(400).json({
        message: "ownerUserId, fileName and category are required"
      });
    }

    const document = await createDocument({
      ownerUserId,
      fileName,
      category,
      className: className || "",
      tags: tags || [],
      metadata: metadata || {}
    });

    return res.status(201).json(document);
  } catch (error) {
    return next(error);
  }
};

export const listByOwner = async (req, res, next) => {
  try {
    const { ownerUserId } = req.params;
    const documents = await getDocumentsByOwner(ownerUserId);
    return res.status(200).json(documents);
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const document = await getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    return res.status(200).json(document);
  } catch (error) {
    return next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "status is required" });
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
    const {
      ownerUserId,
      fileName,
      category,
      className,
      tags,
      metadata,
      storageProvider,
      storagePath,
      status
    } = req.body;
    const payload = {};

    if (ownerUserId !== undefined) {
      payload.ownerUserId = ownerUserId;
    }
    if (fileName !== undefined) {
      payload.fileName = fileName;
    }
    if (category !== undefined) {
      payload.category = category;
    }
    if (className !== undefined) {
      payload.className = className;
    }
    if (tags !== undefined) {
      payload.tags = tags;
    }
    if (metadata !== undefined) {
      payload.metadata = metadata;
    }
    if (storageProvider !== undefined) {
      payload.storageProvider = storageProvider;
    }
    if (storagePath !== undefined) {
      payload.storagePath = storagePath;
    }
    if (status !== undefined) {
      payload.status = status;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one field to update: ownerUserId, fileName, category, className, tags, metadata, storageProvider, storagePath, status"
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
    const deleted = await deleteDocument(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.status(200).json({
      message: "Document deleted successfully.",
      id: deleted.id
    });
  } catch (error) {
    return next(error);
  }
};
