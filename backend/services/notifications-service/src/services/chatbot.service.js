import crypto from "node:crypto";
import {
  createChatSession,
  findActiveChatSessionByOwnerUserId,
  findChatSessionBySessionId,
  listChatSessions,
  updateChatSessionBySessionId
} from "../repositories/chat-sessions.repository.js";
import {
  createChatMessage,
  listChatMessagesBySessionId
} from "../repositories/chat-messages.repository.js";
import { searchKnowledgeBaseArticles } from "../repositories/knowledge-base.repository.js";
import { createEscalatedSupportTicketFromChat } from "./support.service.js";

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const generateSessionId = () =>
  `chat_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;

const assertCanAccessSession = ({ session, actorUid, isAdmin }) => {
  if (!session) {
    throw createHttpError(404, "Chat session not found");
  }

  if (!isAdmin && session.ownerUserId !== actorUid) {
    throw createHttpError(403, "You cannot access this chat session.");
  }
};

const buildFallbackAssistantReply = (message) =>
  `I noted your request: "${message}". I can help with general guidance or escalate to support.`;

const buildKnowledgeAssistantReply = (article) => {
  const title = String(article.title || "").trim();
  const summary = String(article.summary || "").trim();

  if (summary) {
    return `I found a related help article: ${title}. ${summary}`;
  }

  return `I found a related help article: ${title}.`;
};

export const createChatSessionForActor = async ({ actor, payload }) => {
  if (payload.reuseActive) {
    const existing = await findActiveChatSessionByOwnerUserId(actor.uid);
    if (existing) {
      return {
        session: existing,
        created: false
      };
    }
  }

  const session = await createChatSession({
    sessionId: generateSessionId(),
    ownerUserId: actor.uid,
    ownerEmail: actor.email || "",
    channel: payload.channel || "web",
    status: "active",
    startedAt: new Date(),
    context: payload.context || {},
    lastMessageAt: new Date()
  });

  return {
    session,
    created: true
  };
};

export const listChatSessionsForActor = async ({ actor, isAdmin, query }) => {
  const shouldListAll = isAdmin && query.scope === "all";

  return listChatSessions({
    ownerUserId: shouldListAll ? "" : actor.uid,
    status: query.status || "",
    limit: query.limit || 20
  });
};

export const getChatSessionBySessionIdForActor = async ({ sessionId, actor, isAdmin }) => {
  const session = await findChatSessionBySessionId(sessionId);
  assertCanAccessSession({ session, actorUid: actor.uid, isAdmin });
  return session;
};

export const listChatMessagesForSessionForActor = async ({
  sessionId,
  actor,
  isAdmin,
  limit = 100
}) => {
  const session = await findChatSessionBySessionId(sessionId);
  assertCanAccessSession({ session, actorUid: actor.uid, isAdmin });

  return listChatMessagesBySessionId(sessionId, limit);
};

export const postChatMessageForSession = async ({
  sessionId,
  actor,
  isAdmin,
  payload
}) => {
  const session = await findChatSessionBySessionId(sessionId);
  assertCanAccessSession({ session, actorUid: actor.uid, isAdmin });

  if (session.status !== "active") {
    throw createHttpError(409, "Cannot send message to a non-active chat session.");
  }

  const userMessage = await createChatMessage({
    sessionId,
    role: "user",
    content: payload.message,
    source: "user",
    citations: []
  });

  const suggestions = await searchKnowledgeBaseArticles({
    query: payload.message,
    status: "published",
    visibility: "public",
    limit: 3
  });

  const primaryArticle = suggestions[0];
  const assistantContent = primaryArticle
    ? buildKnowledgeAssistantReply(primaryArticle)
    : buildFallbackAssistantReply(payload.message);

  const assistantMessage = await createChatMessage({
    sessionId,
    role: "assistant",
    content: assistantContent,
    source: primaryArticle ? "knowledge-base" : "rule-engine",
    citations:
      payload.includeCitations && primaryArticle
        ? [
            {
              articleId: primaryArticle.articleId,
              title: primaryArticle.title,
              url: `/knowledge-base/articles/${primaryArticle.articleId}`
            }
          ]
        : []
  });

  const updatedSession = await updateChatSessionBySessionId(sessionId, {
    lastMessageAt: assistantMessage.createdAt
  });

  return {
    session: updatedSession || session,
    userMessage,
    assistantMessage,
    suggestions: suggestions.map((article) => ({
      articleId: article.articleId,
      title: article.title,
      category: article.category,
      summary: article.summary
    }))
  };
};

export const escalateChatSessionForActor = async ({
  sessionId,
  actor,
  isAdmin,
  payload
}) => {
  const session = await findChatSessionBySessionId(sessionId);
  assertCanAccessSession({ session, actorUid: actor.uid, isAdmin });

  if (session.escalatedToTicketId) {
    return {
      session,
      ticketId: session.escalatedToTicketId,
      escalated: false
    };
  }

  const transcript = await listChatMessagesBySessionId(sessionId, 200);
  const result = await createEscalatedSupportTicketFromChat({
    ownerUserId: session.ownerUserId,
    ownerEmail: session.ownerEmail || actor.email || "",
    subject: payload.subject || `Escalated chat session ${session.sessionId}`,
    summary: payload.summary || "Escalated from chatbot conversation.",
    priority: payload.priority || "medium",
    transcript
  });

  const updatedSession = await updateChatSessionBySessionId(sessionId, {
    status: "escalated",
    endedAt: new Date(),
    escalatedToTicketId: result.ticket.ticketId
  });

  return {
    session: updatedSession || session,
    ticketId: result.ticket.ticketId,
    escalated: true
  };
};
