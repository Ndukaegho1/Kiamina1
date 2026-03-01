import { Document } from "../models/Document.model.js";

export const createDocumentRecord = async (payload) => Document.create(payload);

export const listDocumentsByOwner = async (ownerUserId) =>
  Document.find({ ownerUserId }).sort({ createdAt: -1 });

export const findDocumentById = async (id) => Document.findById(id);

export const updateDocumentStatus = async (id, status) =>
  Document.findByIdAndUpdate(id, { status }, { new: true });

export const updateDocumentById = async (id, payload) =>
  Document.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

export const deleteDocumentById = async (id) => Document.findByIdAndDelete(id);
