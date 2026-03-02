import { getRequestActor, isAdminActor } from "../utils/request-actor.js";
import {
  createInsightArticleForActor,
  deleteInsightArticleForActor,
  getInsightArticleByIdForActor,
  listInsightArticlesForActor,
  searchInsightArticlesForActor,
  updateInsightArticleForActor
} from "../services/insights.service.js";
import {
  buildInsightArticleUpdatePayload,
  validateCreateInsightArticlePayload,
  validateInsightListQuery,
  validateInsightSearchQuery
} from "../validation/insights.validation.js";

const requireAdminActor = (req, res) => {
  const actor = getRequestActor(req);
  if (!actor.uid) {
    res.status(401).json({
      message: "Missing x-user-id header from authenticated gateway request"
    });
    return null;
  }

  if (!isAdminActor(actor)) {
    res.status(403).json({ message: "Only admin users can perform this action." });
    return null;
  }

  return actor;
};

const resolveReadScope = (req) => {
  const actor = getRequestActor(req);
  return {
    actor,
    isAdmin: Boolean(actor.uid && isAdminActor(actor))
  };
};

export const createInsightArticle = async (req, res, next) => {
  try {
    const actor = requireAdminActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateCreateInsightArticlePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const article = await createInsightArticleForActor({ actor, payload });
    return res.status(201).json(article);
  } catch (error) {
    return next(error);
  }
};

export const listInsightArticles = async (req, res, next) => {
  try {
    const { isAdmin } = resolveReadScope(req);
    const { errors, payload } = validateInsightListQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const articles = await listInsightArticlesForActor({
      isAdmin,
      query: payload
    });
    return res.status(200).json(articles);
  } catch (error) {
    return next(error);
  }
};

export const searchInsightArticles = async (req, res, next) => {
  try {
    const { isAdmin } = resolveReadScope(req);
    const { errors, payload } = validateInsightSearchQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const articles = await searchInsightArticlesForActor({
      isAdmin,
      query: payload
    });
    return res.status(200).json(articles);
  } catch (error) {
    return next(error);
  }
};

export const getInsightArticleById = async (req, res, next) => {
  try {
    const { isAdmin } = resolveReadScope(req);
    const article = await getInsightArticleByIdForActor({
      articleId: req.params.articleId,
      isAdmin
    });
    return res.status(200).json(article);
  } catch (error) {
    return next(error);
  }
};

export const patchInsightArticle = async (req, res, next) => {
  try {
    const actor = requireAdminActor(req, res);
    if (!actor) return;

    const { payload, errors } = buildInsightArticleUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one field to update: title, slug, excerpt, content, category, author, readTimeMinutes, coverImageUrl, status, visibility, tags"
      });
    }

    const updated = await updateInsightArticleForActor({
      articleId: req.params.articleId,
      actor,
      payload
    });
    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const deleteInsightArticle = async (req, res, next) => {
  try {
    const actor = requireAdminActor(req, res);
    if (!actor) return;

    const deleted = await deleteInsightArticleForActor({
      articleId: req.params.articleId
    });
    if (!deleted) {
      return res.status(404).json({ message: "Insight article not found" });
    }

    return res.status(200).json({
      message: "Insight article deleted successfully.",
      articleId: deleted.articleId
    });
  } catch (error) {
    return next(error);
  }
};
