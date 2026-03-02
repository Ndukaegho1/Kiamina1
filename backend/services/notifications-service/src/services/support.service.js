import crypto from "node:crypto";
import {
  createSupportTicket,
  findSupportTicketByTicketId,
  listSupportTickets,
  updateSupportTicketByTicketId
} from "../repositories/support-tickets.repository.js";
import {
  createSupportThread,
  findSupportThreadByTicketId,
  updateSupportThreadByThreadId
} from "../repositories/support-threads.repository.js";
import {
  createSupportMessage,
  listSupportMessagesByThreadId
} from "../repositories/support-messages.repository.js";

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const generateEntityId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;

const assertCanAccessTicket = ({ ticket, actorUid, isAdmin }) => {
  if (!ticket) {
    throw createHttpError(404, "Support ticket not found");
  }

  if (!isAdmin && ticket.ownerUserId !== actorUid) {
    throw createHttpError(403, "You cannot access this support ticket.");
  }
};

const deriveTranscriptPreview = (transcript = []) =>
  transcript
    .slice(-20)
    .map((entry) => {
      const role = String(entry.role || "unknown").toUpperCase();
      const content = String(entry.content || "").trim();
      return `${role}: ${content}`;
    })
    .filter(Boolean)
    .join("\n");

const computeStatusLifecycleUpdate = ({ currentStatus, nextStatus, existingResolvedAt, existingClosedAt }) => {
  if (!nextStatus || nextStatus === currentStatus) {
    return {
      resolvedAt: existingResolvedAt ?? null,
      closedAt: existingClosedAt ?? null
    };
  }

  if (nextStatus === "resolved") {
    return {
      resolvedAt: new Date(),
      closedAt: null
    };
  }

  if (nextStatus === "closed") {
    return {
      resolvedAt: existingResolvedAt || new Date(),
      closedAt: new Date()
    };
  }

  return {
    resolvedAt: null,
    closedAt: null
  };
};

const restrictTicketUpdatePayloadForOwner = (payload) => {
  const allowed = {};
  if (payload.status && ["open", "closed"].includes(payload.status)) {
    allowed.status = payload.status;
  }
  return allowed;
};

export const createSupportTicketForActor = async ({ actor, payload }) => {
  const ticketId = generateEntityId("sup");
  const threadId = generateEntityId("thread");
  const now = new Date();

  const ticket = await createSupportTicket({
    ticketId,
    ownerUserId: actor.uid,
    ownerEmail: actor.email || "",
    subject: payload.subject,
    description: payload.description || "",
    priority: payload.priority || "medium",
    status: "open",
    channel: payload.channel || "web",
    tags: payload.tags || [],
    lastMessageAt: now,
    openedAt: now
  });

  const thread = await createSupportThread({
    threadId,
    ticketId,
    ownerUserId: actor.uid,
    participants: [actor.uid].filter(Boolean),
    source: payload.channel === "chatbot" ? "chatbot" : "support",
    status: "active",
    lastMessageAt: now
  });

  const initialMessage = await createSupportMessage({
    threadId: thread.threadId,
    ticketId: ticket.ticketId,
    senderType: "user",
    senderUid: actor.uid,
    senderDisplayName: "",
    messageType: "text",
    visibility: "public",
    content: payload.description || payload.subject,
    attachments: [],
    metadata: {}
  });

  return {
    ticket,
    thread,
    initialMessage
  };
};

export const createEscalatedSupportTicketFromChat = async ({
  ownerUserId,
  ownerEmail = "",
  subject,
  summary = "",
  priority = "medium",
  transcript = []
}) => {
  const ticketId = generateEntityId("sup");
  const threadId = generateEntityId("thread");
  const now = new Date();

  const ticket = await createSupportTicket({
    ticketId,
    ownerUserId,
    ownerEmail,
    subject: subject || "Chat escalation request",
    description: summary || "Escalated from chatbot conversation.",
    priority,
    status: "open",
    channel: "chatbot",
    tags: ["escalated", "chatbot"],
    lastMessageAt: now,
    openedAt: now
  });

  const thread = await createSupportThread({
    threadId,
    ticketId: ticket.ticketId,
    ownerUserId,
    participants: [ownerUserId, "system"].filter(Boolean),
    source: "chatbot",
    status: "active",
    lastMessageAt: now
  });

  const transcriptPreview = deriveTranscriptPreview(transcript);
  const messageContent = transcriptPreview
    ? `Escalated chat transcript:\n${transcriptPreview}`
    : "Escalated from chatbot with no transcript available.";

  const initialMessage = await createSupportMessage({
    threadId: thread.threadId,
    ticketId: ticket.ticketId,
    senderType: "system",
    senderUid: "system",
    senderDisplayName: "System",
    messageType: "event",
    visibility: "internal",
    content: messageContent,
    attachments: [],
    metadata: {
      source: "chatbot-escalation"
    }
  });

  return {
    ticket,
    thread,
    initialMessage
  };
};

export const listSupportTicketsForActor = async ({ actor, isAdmin, query }) => {
  const shouldListAll = isAdmin && query.scope === "all";

  return listSupportTickets({
    ownerUserId: shouldListAll ? "" : actor.uid,
    status: query.status || "",
    limit: query.limit || 50
  });
};

export const getSupportTicketByTicketIdForActor = async ({ ticketId, actor, isAdmin }) => {
  const ticket = await findSupportTicketByTicketId(ticketId);
  assertCanAccessTicket({ ticket, actorUid: actor.uid, isAdmin });
  return ticket;
};

export const updateSupportTicketForActor = async ({ ticketId, actor, isAdmin, payload }) => {
  const ticket = await findSupportTicketByTicketId(ticketId);
  assertCanAccessTicket({ ticket, actorUid: actor.uid, isAdmin });

  const effectivePayload = isAdmin ? payload : restrictTicketUpdatePayloadForOwner(payload);
  if (Object.keys(effectivePayload).length === 0) {
    throw createHttpError(
      isAdmin ? 400 : 403,
      isAdmin
        ? "Provide at least one field to update."
        : "You can only update your ticket status to open or closed."
    );
  }

  const lifecycle = computeStatusLifecycleUpdate({
    currentStatus: ticket.status,
    nextStatus: effectivePayload.status,
    existingResolvedAt: ticket.resolvedAt,
    existingClosedAt: ticket.closedAt
  });

  const updated = await updateSupportTicketByTicketId(ticketId, {
    ...effectivePayload,
    ...lifecycle
  });

  return updated;
};

export const postSupportMessageForTicket = async ({ ticketId, actor, isAdmin, payload }) => {
  const ticket = await findSupportTicketByTicketId(ticketId);
  assertCanAccessTicket({ ticket, actorUid: actor.uid, isAdmin });

  let thread = await findSupportThreadByTicketId(ticketId);
  if (!thread) {
    thread = await createSupportThread({
      threadId: generateEntityId("thread"),
      ticketId,
      ownerUserId: ticket.ownerUserId,
      participants: [ticket.ownerUserId].filter(Boolean),
      source: ticket.channel === "chatbot" ? "chatbot" : "support",
      status: "active",
      lastMessageAt: new Date()
    });
  }

  const senderType = isAdmin ? "agent" : "user";
  const visibility = isAdmin ? payload.visibility : "public";

  const message = await createSupportMessage({
    threadId: thread.threadId,
    ticketId: ticket.ticketId,
    senderType,
    senderUid: actor.uid,
    senderDisplayName: payload.senderDisplayName || "",
    messageType: "text",
    visibility,
    content: payload.content,
    attachments: payload.attachments || [],
    metadata: {}
  });

  const participants = [...new Set([...(thread.participants || []), actor.uid].filter(Boolean))];
  await updateSupportThreadByThreadId(thread.threadId, {
    participants,
    lastMessageAt: message.createdAt
  });

  const ticketStatusUpdate =
    isAdmin && ticket.status === "open"
      ? "in-progress"
      : !isAdmin && ticket.status === "waiting-user"
        ? "open"
        : ticket.status;

  await updateSupportTicketByTicketId(ticketId, {
    lastMessageAt: message.createdAt,
    status: ticketStatusUpdate
  });

  return message;
};

export const listSupportMessagesForTicket = async ({ ticketId, actor, isAdmin, limit = 100 }) => {
  const ticket = await findSupportTicketByTicketId(ticketId);
  assertCanAccessTicket({ ticket, actorUid: actor.uid, isAdmin });

  const thread = await findSupportThreadByTicketId(ticketId);
  if (!thread) {
    return [];
  }

  const messages = await listSupportMessagesByThreadId(thread.threadId, limit);
  if (isAdmin) {
    return messages;
  }

  return messages.filter((message) => message.visibility !== "internal");
};
