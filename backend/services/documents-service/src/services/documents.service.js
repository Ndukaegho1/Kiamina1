import {
  createDocumentRecord,
  deleteDocumentById,
  findDocumentById,
  listDocumentsByOwner,
  updateDocumentById,
  updateDocumentStatus
} from "../repositories/documents.repository.js";

export const createDocument = async (payload) => createDocumentRecord(payload);

export const getDocumentsByOwner = async (ownerUserId) =>
  listDocumentsByOwner(ownerUserId);

export const getDocumentById = async (id) => findDocumentById(id);

export const changeDocumentStatus = async ({ id, status }) =>
  updateDocumentStatus(id, status);

export const updateDocument = async ({ id, payload }) =>
  updateDocumentById(id, payload);

export const deleteDocument = async (id) => deleteDocumentById(id);
