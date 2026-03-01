import {
  createDocumentRecord,
  findDocumentById,
  listDocumentsByOwner,
  updateDocumentStatus
} from "../repositories/documents.repository.js";

export const createDocument = async (payload) => createDocumentRecord(payload);

export const getDocumentsByOwner = async (ownerUserId) =>
  listDocumentsByOwner(ownerUserId);

export const getDocumentById = async (id) => findDocumentById(id);

export const changeDocumentStatus = async ({ id, status }) =>
  updateDocumentStatus(id, status);
