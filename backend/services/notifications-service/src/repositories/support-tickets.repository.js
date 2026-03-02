import { SupportTicket } from "../models/SupportTicket.model.js";

export const createSupportTicket = async (payload) => SupportTicket.create(payload);

export const findSupportTicketByTicketId = async (ticketId) =>
  SupportTicket.findOne({ ticketId });

export const listSupportTickets = async ({ ownerUserId = "", status = "", limit = 50 } = {}) => {
  const query = {};
  if (ownerUserId) query.ownerUserId = ownerUserId;
  if (status) query.status = status;

  return SupportTicket.find(query).sort({ updatedAt: -1 }).limit(limit);
};

export const updateSupportTicketByTicketId = async (ticketId, payload) =>
  SupportTicket.findOneAndUpdate(
    { ticketId },
    { $set: payload },
    {
      new: true,
      runValidators: true
    }
  );
