import Joi from "joi";

const CATEGORIES = ["faq", "billing", "technical", "security", "getting-started", "other"];
const STATUSES = ["draft", "published", "archived"];
const VISIBILITIES = ["public", "internal"];

const VALIDATION_OPTIONS = {
  abortEarly: false,
  convert: true,
  stripUnknown: true
};

const normalizeString = (value) => String(value ?? "").trim();
const normalizeSource = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const toErrors = (error) => {
  if (!error) return [];
  return error.details.map((detail) => detail.message.replace(/"/g, ""));
};

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((tag) => normalizeString(tag).toLowerCase()).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
  }

  return [];
};

const createArticleSchema = Joi.object({
  title: Joi.string().trim().required().max(200).messages({
    "any.required": "title is required",
    "string.empty": "title is required",
    "string.max": "title must be at most 200 characters"
  }),
  slug: Joi.string().trim().allow("").max(220).default("").messages({
    "string.max": "slug must be at most 220 characters"
  }),
  summary: Joi.string().trim().allow("").max(500).default("").messages({
    "string.max": "summary must be at most 500 characters"
  }),
  content: Joi.string().trim().required().max(20000).messages({
    "any.required": "content is required",
    "string.empty": "content is required",
    "string.max": "content must be at most 20000 characters"
  }),
  category: Joi.string().trim().lowercase().valid(...CATEGORIES).default("faq").messages({
    "any.only": "category must be one of: faq, billing, technical, security, getting-started, other"
  }),
  status: Joi.string().trim().lowercase().valid(...STATUSES).default("draft").messages({
    "any.only": "status must be one of: draft, published, archived"
  }),
  visibility: Joi.string().trim().lowercase().valid(...VISIBILITIES).default("public").messages({
    "any.only": "visibility must be one of: public, internal"
  })
});

const updateArticleSchema = Joi.object({
  title: Joi.string().trim().allow("").max(200).optional(),
  slug: Joi.string().trim().allow("").max(220).optional(),
  summary: Joi.string().trim().allow("").max(500).optional(),
  content: Joi.string().trim().allow("").max(20000).optional(),
  category: Joi.string().trim().lowercase().valid(...CATEGORIES).optional(),
  status: Joi.string().trim().lowercase().valid(...STATUSES).optional(),
  visibility: Joi.string().trim().lowercase().valid(...VISIBILITIES).optional()
});

const listArticlesQuerySchema = Joi.object({
  status: Joi.string().trim().lowercase().valid(...STATUSES).allow("").default(""),
  category: Joi.string().trim().lowercase().valid(...CATEGORIES).allow("").default(""),
  visibility: Joi.string().trim().lowercase().valid(...VISIBILITIES).allow("").default(""),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

const searchQuerySchema = Joi.object({
  q: Joi.string().trim().allow("").max(200).default(""),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

export const validateCreateKnowledgeBaseArticlePayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = createArticleSchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      title: value?.title || "",
      slug: value?.slug || "",
      summary: value?.summary || "",
      content: value?.content || "",
      category: value?.category || "faq",
      status: value?.status || "draft",
      visibility: value?.visibility || "public",
      tags: normalizeTags(source.tags)
    }
  };
};

export const buildKnowledgeBaseArticleUpdatePayload = (body) => {
  const source = normalizeSource(body);
  const { value, error } = updateArticleSchema.validate(source, VALIDATION_OPTIONS);
  const payload = {};

  if (value?.title !== undefined) payload.title = normalizeString(value.title);
  if (value?.slug !== undefined) payload.slug = normalizeString(value.slug);
  if (value?.summary !== undefined) payload.summary = normalizeString(value.summary);
  if (value?.content !== undefined) payload.content = normalizeString(value.content);
  if (value?.category !== undefined) payload.category = value.category;
  if (value?.status !== undefined) payload.status = value.status;
  if (value?.visibility !== undefined) payload.visibility = value.visibility;
  if (source.tags !== undefined) payload.tags = normalizeTags(source.tags);

  return {
    errors: toErrors(error),
    payload
  };
};

export const validateKnowledgeBaseListQuery = (query) => {
  const source = normalizeSource(query);
  const { value, error } = listArticlesQuerySchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      status: value?.status || "",
      category: value?.category || "",
      visibility: value?.visibility || "",
      limit: value?.limit || 50
    }
  };
};

export const validateKnowledgeBaseSearchQuery = (query) => {
  const source = normalizeSource(query);
  const { value, error } = searchQuerySchema.validate(source, VALIDATION_OPTIONS);

  return {
    errors: toErrors(error),
    payload: {
      q: value?.q || "",
      limit: value?.limit || 10
    }
  };
};
