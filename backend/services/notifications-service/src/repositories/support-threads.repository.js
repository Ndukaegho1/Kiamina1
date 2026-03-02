import { SupportThread } from "../models/SupportThread.model.js";

export const createSupportThread = async (payload) => SupportThread.create(payload);

export const findSupportThreadByThreadId = async (threadId) =>
  SupportThread.findOne({ threadId });

export const findSupportThreadByTicketId = async (ticketId) =>
  SupportThread.findOne({ ticketId });

export const updateSupportThreadByThreadId = async (threadId, payload) =>
  SupportThread.findOneAndUpdate(
    { threadId },
    { $set: payload },
    {
      new: true,
      runValidators: true
    }
  );
