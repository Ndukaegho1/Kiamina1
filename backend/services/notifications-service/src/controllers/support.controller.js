import { getRequestActor, isAdminActor } from "../utils/request-actor.js";
import {
  createSupportTicketForActor,
  getSupportTicketByTicketIdForActor,
  listSupportMessagesForTicket,
  listSupportTicketsForActor,
  postSupportMessageForTicket,
  updateSupportTicketForActor
} from "../services/support.service.js";
import {
  buildSupportTicketUpdatePayload,
  validateCreateSupportMessagePayload,
  validateCreateSupportTicketPayload,
  validateSupportMessagesListQuery,
  validateSupportTicketListQuery
} from "../validation/support.validation.js";

const requireActor = (req, res) => {
  const actor = getRequestActor(req);
  if (!actor.uid) {
    res.status(401).json({
      message: "Missing x-user-id header from authenticated gateway request"
    });
    return null;
  }

  return actor;
};

export const createTicket = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateCreateSupportTicketPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await createSupportTicketForActor({ actor, payload });
    return res.status(201).json({
      message: "Support ticket created.",
      ticket: result.ticket,
      thread: result.thread,
      initialMessage: result.initialMessage
    });
  } catch (error) {
    return next(error);
  }
};

export const listTickets = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateSupportTicketListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const tickets = await listSupportTicketsForActor({
      actor,
      isAdmin: isAdminActor(actor),
      query: payload
    });

    return res.status(200).json(tickets);
  } catch (error) {
    return next(error);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const ticket = await getSupportTicketByTicketIdForActor({
      ticketId: req.params.ticketId,
      actor,
      isAdmin: isAdminActor(actor)
    });

    return res.status(200).json(ticket);
  } catch (error) {
    return next(error);
  }
};

export const patchTicket = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { payload, errors } = buildSupportTicketUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update: subject, description, priority, status, assignedToUid, tags"
      });
    }

    const updated = await updateSupportTicketForActor({
      ticketId: req.params.ticketId,
      actor,
      isAdmin: isAdminActor(actor),
      payload
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const postTicketMessage = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateCreateSupportMessagePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const message = await postSupportMessageForTicket({
      ticketId: req.params.ticketId,
      actor,
      isAdmin: isAdminActor(actor),
      payload
    });

    return res.status(201).json({
      message: "Support message sent.",
      data: message
    });
  } catch (error) {
    return next(error);
  }
};

export const listTicketMessages = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateSupportMessagesListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const messages = await listSupportMessagesForTicket({
      ticketId: req.params.ticketId,
      actor,
      isAdmin: isAdminActor(actor),
      limit: payload.limit
    });

    return res.status(200).json(messages);
  } catch (error) {
    return next(error);
  }
};
