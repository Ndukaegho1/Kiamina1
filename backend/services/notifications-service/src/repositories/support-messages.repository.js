import { SupportMessage } from "../models/SupportMessage.model.js";

export const createSupportMessage = async (payload) => SupportMessage.create(payload);

export const listSupportMessagesByThreadId = async (threadId, limit = 100) =>
  SupportMessage.find({ threadId }).sort({ createdAt: 1 }).limit(limit);
