const CATEGORIES = new Set(["expenses", "sales", "bank-statements", "other"]);
const STATUSES = new Set(["processing", "to-review", "ready"]);
const STORAGE_PROVIDERS = new Set(["firebase", "s3", "local", "unknown"]);

const normalizeString = (value) => String(value ?? "").trim();

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

const normalizeCategory = (value) => normalizeString(value).toLowerCase();
const normalizeStatus = (value) => normalizeString(value).toLowerCase();

export const validateCreateDocumentPayload = (body) => {
  const ownerUserId = normalizeString(body?.ownerUserId);
  const fileName = normalizeString(body?.fileName);
  const category = normalizeCategory(body?.category);
  const className = body?.className === undefined ? "" : normalizeString(body.className);
  const tags = parseTags(body?.tags);
  const metadata = parseMetadata(body?.metadata);
  const errors = [];

  if (!ownerUserId) {
    errors.push("ownerUserId is required");
  }

  if (!fileName) {
    errors.push("fileName is required");
  } else if (fileName.length > 255) {
    errors.push("fileName must be at most 255 characters");
  }

  if (!category) {
    errors.push("category is required");
  } else if (!CATEGORIES.has(category)) {
    errors.push("category must be one of: expenses, sales, bank-statements, other");
  }

  if (className.length > 120) {
    errors.push("className must be at most 120 characters");
  }

  if (!tags) {
    errors.push("tags must be an array of strings or comma-separated string");
  }

  if (!metadata) {
    errors.push("metadata must be a valid JSON object");
  }

  return {
    errors,
    payload: {
      ownerUserId,
      fileName,
      category,
      className,
      tags: tags || [],
      metadata: metadata || {}
    }
  };
};

export const buildDocumentUpdatePayload = (body) => {
  const payload = {};
  const errors = [];

  if (body?.ownerUserId !== undefined) {
    const ownerUserId = normalizeString(body.ownerUserId);
    if (!ownerUserId) {
      errors.push("ownerUserId cannot be empty");
    } else {
      payload.ownerUserId = ownerUserId;
    }
  }

  if (body?.fileName !== undefined) {
    const fileName = normalizeString(body.fileName);
    if (!fileName) {
      errors.push("fileName cannot be empty");
    } else if (fileName.length > 255) {
      errors.push("fileName must be at most 255 characters");
    } else {
      payload.fileName = fileName;
    }
  }

  if (body?.category !== undefined) {
    const category = normalizeCategory(body.category);
    if (!CATEGORIES.has(category)) {
      errors.push("category must be one of: expenses, sales, bank-statements, other");
    } else {
      payload.category = category;
    }
  }

  if (body?.className !== undefined) {
    const className = normalizeString(body.className);
    if (className.length > 120) {
      errors.push("className must be at most 120 characters");
    } else {
      payload.className = className;
    }
  }

  if (body?.tags !== undefined) {
    const tags = parseTags(body.tags);
    if (!tags) {
      errors.push("tags must be an array of strings or comma-separated string");
    } else {
      payload.tags = tags;
    }
  }

  if (body?.metadata !== undefined) {
    const metadata = parseMetadata(body.metadata);
    if (!metadata) {
      errors.push("metadata must be a valid JSON object");
    } else {
      payload.metadata = metadata;
    }
  }

  if (body?.storageProvider !== undefined) {
    const storageProvider = normalizeString(body.storageProvider).toLowerCase();
    if (!STORAGE_PROVIDERS.has(storageProvider)) {
      errors.push("storageProvider must be one of: firebase, s3, local, unknown");
    } else {
      payload.storageProvider = storageProvider;
    }
  }

  if (body?.storagePath !== undefined) {
    const storagePath = normalizeString(body.storagePath);
    if (storagePath.length > 500) {
      errors.push("storagePath must be at most 500 characters");
    } else {
      payload.storagePath = storagePath;
    }
  }

  if (body?.status !== undefined) {
    const status = normalizeStatus(body.status);
    if (!STATUSES.has(status)) {
      errors.push("status must be one of: processing, to-review, ready");
    } else {
      payload.status = status;
    }
  }

  return { payload, errors };
};

export const validateStatusPayload = (body) => {
  const status = normalizeStatus(body?.status);

  if (!status) {
    return {
      error: "status is required"
    };
  }

  if (!STATUSES.has(status)) {
    return {
      error: "status must be one of: processing, to-review, ready"
    };
  }

  return { status };
};

export const validateUploadBody = (body) => {
  const ownerUserId = body?.ownerUserId === undefined ? "" : normalizeString(body.ownerUserId);
  const category = normalizeCategory(body?.category || "other");
  const className = body?.className === undefined ? "" : normalizeString(body.className);
  const tags = parseTags(body?.tags);
  const metadata = parseMetadata(body?.metadata);
  const errors = [];

  if (ownerUserId && ownerUserId.length > 128) {
    errors.push("ownerUserId must be at most 128 characters");
  }

  if (!CATEGORIES.has(category)) {
    errors.push("category must be one of: expenses, sales, bank-statements, other");
  }

  if (className.length > 120) {
    errors.push("className must be at most 120 characters");
  }

  if (!tags) {
    errors.push("tags must be an array of strings or comma-separated string");
  }

  if (!metadata) {
    errors.push("metadata must be a valid JSON object");
  }

  return {
    errors,
    payload: {
      ownerUserId,
      category,
      className,
      tags: tags || [],
      metadata: metadata || {}
    }
  };
};
