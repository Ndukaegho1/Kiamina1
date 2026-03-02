import crypto from "node:crypto";
import {
  createInsightArticle,
  deleteInsightArticleByArticleId,
  findInsightArticleByArticleId,
  listInsightArticles,
  searchInsightArticles,
  updateInsightArticleByArticleId
} from "../repositories/insights.repository.js";

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const generateArticleId = () =>
  `ins_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;

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
    throw createHttpError(404, "Insight article not found");
  }

  if (!isAdmin && (article.status !== "published" || article.visibility !== "public")) {
    throw createHttpError(404, "Insight article not found");
  }
};

export const createInsightArticleForActor = async ({ actor, payload }) => {
  const slug = payload.slug || slugify(payload.title);
  const status = payload.status || "draft";

  return createInsightArticle({
    articleId: generateArticleId(),
    title: payload.title,
    slug,
    excerpt: payload.excerpt || "",
    content: payload.content,
    category: payload.category || "financial-strategy",
    author: payload.author || "Kiamina Advisory Team",
    readTimeMinutes: payload.readTimeMinutes || 6,
    coverImageUrl: payload.coverImageUrl || "",
    tags: payload.tags || [],
    status,
    visibility: payload.visibility || "public",
    publishedAt: status === "published" ? new Date() : null,
    createdByUid: actor.uid,
    updatedByUid: actor.uid
  });
};

export const listInsightArticlesForActor = async ({ isAdmin, query }) => {
  const effectiveQuery = applyVisibilityConstraints({ isAdmin, query });
  return listInsightArticles(effectiveQuery);
};

export const searchInsightArticlesForActor = async ({ isAdmin, query }) => {
  const effectiveQuery = applyVisibilityConstraints({
    isAdmin,
    query: {
      query: query.q,
      limit: query.limit,
      status: query.status || "",
      visibility: query.visibility || ""
    }
  });

  return searchInsightArticles(effectiveQuery);
};

export const getInsightArticleByIdForActor = async ({ articleId, isAdmin }) => {
  const article = await findInsightArticleByArticleId(articleId);
  assertCanReadArticle({ article, isAdmin });
  return article;
};

export const updateInsightArticleForActor = async ({ articleId, actor, payload }) => {
  const existing = await findInsightArticleByArticleId(articleId);
  if (!existing) {
    throw createHttpError(404, "Insight article not found");
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

  return updateInsightArticleByArticleId(articleId, nextPayload);
};

export const deleteInsightArticleForActor = async ({ articleId }) =>
  deleteInsightArticleByArticleId(articleId);
