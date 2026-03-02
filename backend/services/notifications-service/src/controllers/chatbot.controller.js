import { getRequestActor, isAdminActor } from "../utils/request-actor.js";
import {
  createChatSessionForActor,
  escalateChatSessionForActor,
  getChatSessionBySessionIdForActor,
  listChatMessagesForSessionForActor,
  listChatSessionsForActor,
  postChatMessageForSession
} from "../services/chatbot.service.js";
import {
  validateChatMessagesListQuery,
  validateChatSessionsListQuery,
  validateCreateChatSessionPayload,
  validateEscalateChatSessionPayload,
  validatePostChatMessagePayload
} from "../validation/chatbot.validation.js";

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

export const createSession = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateCreateChatSessionPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await createChatSessionForActor({ actor, payload });
    return res.status(result.created ? 201 : 200).json({
      message: result.created ? "Chat session created." : "Active chat session reused.",
      session: result.session
    });
  } catch (error) {
    return next(error);
  }
};

export const listSessions = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateChatSessionsListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const sessions = await listChatSessionsForActor({
      actor,
      isAdmin: isAdminActor(actor),
      query: payload
    });

    return res.status(200).json(sessions);
  } catch (error) {
    return next(error);
  }
};

export const getSessionById = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const session = await getChatSessionBySessionIdForActor({
      sessionId: req.params.sessionId,
      actor,
      isAdmin: isAdminActor(actor)
    });

    return res.status(200).json(session);
  } catch (error) {
    return next(error);
  }
};

export const listSessionMessages = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateChatMessagesListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const messages = await listChatMessagesForSessionForActor({
      sessionId: req.params.sessionId,
      actor,
      isAdmin: isAdminActor(actor),
      limit: payload.limit
    });

    return res.status(200).json(messages);
  } catch (error) {
    return next(error);
  }
};

export const postSessionMessage = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { errors, payload } = validatePostChatMessagePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await postChatMessageForSession({
      sessionId: req.params.sessionId,
      actor,
      isAdmin: isAdminActor(actor),
      payload
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
};

export const escalateSession = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateEscalateChatSessionPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const result = await escalateChatSessionForActor({
      sessionId: req.params.sessionId,
      actor,
      isAdmin: isAdminActor(actor),
      payload
    });

    return res.status(200).json({
      message: result.escalated
        ? "Chat session escalated to support."
        : "Chat session already escalated.",
      session: result.session,
      ticketId: result.ticketId
    });
  } catch (error) {
    return next(error);
  }
};
