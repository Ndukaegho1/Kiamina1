import { ChatMessage } from "../models/ChatMessage.model.js";

export const createChatMessage = async (payload) => ChatMessage.create(payload);

export const listChatMessagesBySessionId = async (sessionId, limit = 100) =>
  ChatMessage.find({ sessionId }).sort({ createdAt: 1 }).limit(limit);
