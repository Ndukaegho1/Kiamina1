import crypto from "node:crypto";
import {
  createKnowledgeBaseArticle,
  deleteKnowledgeBaseArticleByArticleId,
  findKnowledgeBaseArticleByArticleId,
  listKnowledgeBaseArticles,
  searchKnowledgeBaseArticles,
  updateKnowledgeBaseArticleByArticleId
} from "../repositories/knowledge-base.repository.js";

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const generateArticleId = () =>
  `kb_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const applyVisibilityConstraints = ({ isAdmin, query }) => {
  if (isAdmin) {
    return query;
  }

  return {
    ...query,
    status: "published",
    visibility: "public"
  };
};

const assertCanReadArticle = ({ article, isAdmin }) => {
  if (!article) {
    throw createHttpError(404, "Knowledge base article not found");
  }

  if (!isAdmin && (article.status !== "published" || article.visibility !== "public")) {
    throw createHttpError(404, "Knowledge base article not found");
  }
};

export const createKnowledgeBaseArticleForActor = async ({ actor, payload }) => {
  const slug = payload.slug || slugify(payload.title);
  const status = payload.status || "draft";

  return createKnowledgeBaseArticle({
    articleId: generateArticleId(),
    title: payload.title,
    slug,
    summary: payload.summary || "",
    content: payload.content,
    category: payload.category || "faq",
    tags: payload.tags || [],
    status,
    visibility: payload.visibility || "public",
    publishedAt: status === "published" ? new Date() : null,
    createdByUid: actor.uid,
    updatedByUid: actor.uid
  });
};

export const listKnowledgeBaseArticlesForActor = async ({ isAdmin, query }) => {
  const effectiveQuery = applyVisibilityConstraints({ isAdmin, query });
  return listKnowledgeBaseArticles(effectiveQuery);
};

export const searchKnowledgeBaseArticlesForActor = async ({ isAdmin, query }) => {
  const effectiveQuery = applyVisibilityConstraints({
    isAdmin,
    query: {
      query: query.q,
      limit: query.limit,
      status: query.status || "",
      visibility: query.visibility || ""
    }
  });

  return searchKnowledgeBaseArticles(effectiveQuery);
};

export const getKnowledgeBaseArticleByIdForActor = async ({ articleId, isAdmin }) => {
  const article = await findKnowledgeBaseArticleByArticleId(articleId);
  assertCanReadArticle({ article, isAdmin });
  return article;
};

export const updateKnowledgeBaseArticleForActor = async ({ articleId, actor, payload }) => {
  const existing = await findKnowledgeBaseArticleByArticleId(articleId);
  if (!existing) {
    throw createHttpError(404, "Knowledge base article not found");
  }

  const nextPayload = {
    ...payload,
    updatedByUid: actor.uid
  };

  if (payload.slug !== undefined) {
    nextPayload.slug = payload.slug || slugify(payload.title || existing.title);
  } else if (payload.title !== undefined) {
    nextPayload.slug = slugify(payload.title);
  }

  if (payload.status === "published" && !existing.publishedAt) {
    nextPayload.publishedAt = new Date();
  }
  if (payload.status && payload.status !== "published") {
    nextPayload.publishedAt = null;
  }

  return updateKnowledgeBaseArticleByArticleId(articleId, nextPayload);
};

export const deleteKnowledgeBaseArticleForActor = async ({ articleId }) =>
  deleteKnowledgeBaseArticleByArticleId(articleId);
