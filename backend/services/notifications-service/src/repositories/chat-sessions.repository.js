import { ChatSession } from "../models/ChatSession.model.js";

export const createChatSession = async (payload) => ChatSession.create(payload);

export const findChatSessionBySessionId = async (sessionId) =>
  ChatSession.findOne({ sessionId });

export const findActiveChatSessionByOwnerUserId = async (ownerUserId) =>
  ChatSession.findOne({
    ownerUserId,
    status: "active"
  }).sort({ createdAt: -1 });

export const listChatSessions = async ({ ownerUserId = "", status = "", limit = 20 } = {}) => {
  const query = {};
  if (ownerUserId) query.ownerUserId = ownerUserId;
  if (status) query.status = status;

  return ChatSession.find(query).sort({ updatedAt: -1 }).limit(limit);
};

export const updateChatSessionBySessionId = async (sessionId, payload) =>
  ChatSession.findOneAndUpdate(
    { sessionId },
    { $set: payload },
    {
      new: true,
      runValidators: true
    }
  );
