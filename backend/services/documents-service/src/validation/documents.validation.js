import Joi from "joi";

const CATEGORIES = ["expenses", "sales", "bank-statements", "other"];
const STATUSES = ["processing", "to-review", "ready"];
const STORAGE_PROVIDERS = ["mongodb", "firebase", "s3", "local", "unknown"];
const STORAGE_PROVIDERS_TEXT = STORAGE_PROVIDERS.join(", ");

const normalizeString = (value) => String(value ?? "").trim();
const normalizeSource = (body) =>
  body && typeof body === "object" && !Array.isArray(body) ? body : {};
const normalizeCategory = (value) => normalizeString(value).toLowerCase();
const normalizeStatus = (value) => normalizeString(value).toLowerCase();

const toErrors = (error) => {
  if (!error) {
    return [];
  }

  return error.details.map((detail) => detail.message.replace(/"/g, ""));
};

const parseTags = (value) => {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((tag) => normalizeString(tag).toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((tag) => normalizeString(tag).toLowerCase())
          .filter(Boolean);
      }
    } catch {
      return trimmed
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  return null;
};

const parseMetadata = (value) => {
  if (value === undefined) {
    return {};
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  return null;
};

const createDocumentSchema = Joi.object({
  ownerUserId: Joi.string().trim().required().messages({
    "any.required": "ownerUserId is required",
    "string.empty": "ownerUserId is required"
  }),
  fileName: Joi.string().trim().required().max(255).messages({
    "any.required": "fileName is required",
    "string.empty": "fileName is required",
    "string.max": "fileName must be at most 255 characters"
  }),
  category: Joi.string().trim().lowercase().required().valid(...CATEGORIES).messages({
    "any.required": "category is required",
    "string.empty": "category is required",
    "any.only": "category must be one of: expenses, sales, bank-statements, other"
  }),
  className: Joi.string().trim().allow("").max(120).default("").messages({
    "string.max": "className must be at most 120 characters"
  }),
  tags: Joi.array().items(Joi.string()).default([]),
  metadata: Joi.object().default({})
});

const uploadSchema = Joi.object({
  ownerUserId: Joi.string().trim().allow("").max(128).default("").messages({
    "string.max": "ownerUserId must be at most 128 characters"
  }),
  category: Joi.string().trim().lowercase().valid(...CATEGORIES).default("other").messages({
    "any.only": "category must be one of: expenses, sales, bank-statements, other"
  }),
  className: Joi.string().trim().allow("").max(120).default("").messages({
    "string.max": "className must be at most 120 characters"
  }),
  tags: Joi.array().items(Joi.string()).default([]),
  metadata: Joi.object().default({})
});

const statusSchema = Joi.string().trim().lowercase().required().valid(...STATUSES).messages({
  "any.required": "status is required",
  "string.empty": "status is required",
  "any.only": "status must be one of: processing, to-review, ready"
});

const ownerUserIdUpdateSchema = Joi.string().trim().required().messages({
  "string.empty": "ownerUserId cannot be empty"
});
const fileNameUpdateSchema = Joi.string().trim().required().max(255).messages({
  "string.empty": "fileName cannot be empty",
  "string.max": "fileName must be at most 255 characters"
});
const categoryUpdateSchema = Joi.string().trim().lowercase().valid(...CATEGORIES).messages({
  "any.only": "category must be one of: expenses, sales, bank-statements, other"
});
const classNameUpdateSchema = Joi.string().trim().allow("").max(120).messages({
  "string.max": "className must be at most 120 characters"
});
const storageProviderSchema = Joi.string().trim().lowercase().valid(...STORAGE_PROVIDERS).messages({
  "any.only": `storageProvider must be one of: ${STORAGE_PROVIDERS_TEXT}`
});
const storagePathSchema = Joi.string().trim().allow("").max(500).messages({
  "string.max": "storagePath must be at most 500 characters"
});

export const validateCreateDocumentPayload = (body) => {
  const source = normalizeSource(body);
  const tags = parseTags(source.tags);
  const metadata = parseMetadata(source.metadata);

  const { value, error } = createDocumentSchema.validate(
    {
      ownerUserId: normalizeString(source.ownerUserId),
      fileName: normalizeString(source.fileName),
      category: normalizeCategory(source.category),
      className: source.className === undefined ? "" : normalizeString(source.className),
      tags: tags || [],
      metadata: metadata || {}
    },
    {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    }
  );

  const errors = toErrors(error);
  if (!tags) {
    errors.push("tags must be an array of strings or comma-separated string");
  }
  if (!metadata) {
    errors.push("metadata must be a valid JSON object");
  }

  return {
    errors,
    payload: {
      ownerUserId: value?.ownerUserId || "",
      fileName: value?.fileName || "",
      category: value?.category || "",
      className: value?.className || "",
      tags: value?.tags || [],
      metadata: value?.metadata || {}
    }
  };
};

export const buildDocumentUpdatePayload = (body) => {
  const source = normalizeSource(body);
  const payload = {};
  const errors = [];

  if (source.ownerUserId !== undefined) {
    const ownerUserId = normalizeString(source.ownerUserId);
    const { error } = ownerUserIdUpdateSchema.validate(ownerUserId);
    if (error) {
      errors.push("ownerUserId cannot be empty");
    } else {
      payload.ownerUserId = ownerUserId;
    }
  }

  if (source.fileName !== undefined) {
    const fileName = normalizeString(source.fileName);
    const { error } = fileNameUpdateSchema.validate(fileName);
    if (error) {
      errors.push(fileName ? "fileName must be at most 255 characters" : "fileName cannot be empty");
    } else {
      payload.fileName = fileName;
    }
  }

  if (source.category !== undefined) {
    const category = normalizeCategory(source.category);
    const { error } = categoryUpdateSchema.validate(category);
    if (error) {
      errors.push("category must be one of: expenses, sales, bank-statements, other");
    } else {
      payload.category = category;
    }
  }

  if (source.className !== undefined) {
    const className = normalizeString(source.className);
    const { error } = classNameUpdateSchema.validate(className);
    if (error) {
      errors.push("className must be at most 120 characters");
    } else {
      payload.className = className;
    }
  }

  if (source.tags !== undefined) {
    const tags = parseTags(source.tags);
    if (!tags) {
      errors.push("tags must be an array of strings or comma-separated string");
    } else {
      payload.tags = tags;
    }
  }

  if (source.metadata !== undefined) {
    const metadata = parseMetadata(source.metadata);
    if (!metadata) {
      errors.push("metadata must be a valid JSON object");
    } else {
      payload.metadata = metadata;
    }
  }

  if (source.storageProvider !== undefined) {
    const storageProvider = normalizeString(source.storageProvider).toLowerCase();
    const { error } = storageProviderSchema.validate(storageProvider);
    if (error) {
      errors.push(`storageProvider must be one of: ${STORAGE_PROVIDERS_TEXT}`);
    } else {
      payload.storageProvider = storageProvider;
    }
  }

  if (source.storagePath !== undefined) {
    const storagePath = normalizeString(source.storagePath);
    const { error } = storagePathSchema.validate(storagePath);
    if (error) {
      errors.push("storagePath must be at most 500 characters");
    } else {
      payload.storagePath = storagePath;
    }
  }

  if (source.status !== undefined) {
    const status = normalizeStatus(source.status);
    const { error } = statusSchema.validate(status);
    if (error) {
      errors.push("status must be one of: processing, to-review, ready");
    } else {
      payload.status = status;
    }
  }

  return { payload, errors };
};

export const validateStatusPayload = (body) => {
  const source = normalizeSource(body);
  const status = normalizeStatus(source.status);
  const { error } = statusSchema.validate(status);

  if (error) {
    const message = status ? "status must be one of: processing, to-review, ready" : "status is required";
    return { error: message };
  }

  return { status };
};

export const validateUploadBody = (body) => {
  const source = normalizeSource(body);
  const tags = parseTags(source.tags);
  const metadata = parseMetadata(source.metadata);

  const { value, error } = uploadSchema.validate(
    {
      ownerUserId: source.ownerUserId === undefined ? "" : normalizeString(source.ownerUserId),
      category: normalizeCategory(source.category || "other"),
      className: source.className === undefined ? "" : normalizeString(source.className),
      tags: tags || [],
      metadata: metadata || {}
    },
    {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    }
  );

  const errors = toErrors(error);
  if (!tags) {
    errors.push("tags must be an array of strings or comma-separated string");
  }
  if (!metadata) {
    errors.push("metadata must be a valid JSON object");
  }

  return {
    errors,
    payload: {
      ownerUserId: value?.ownerUserId || "",
      category: value?.category || "other",
      className: value?.className || "",
      tags: value?.tags || [],
      metadata: value?.metadata || {}
    }
  };
};
