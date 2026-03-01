import {
  changeDocumentStatus,
  createDocument,
  getDocumentById,
  getDocumentsByOwner
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
