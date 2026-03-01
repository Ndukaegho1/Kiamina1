const CATEGORIES = new Set(["expenses", "sales", "bank-statements", "other"]);
const STATUSES = new Set(["draft", "posted", "archived"]);
const TRANSACTION_TYPES = new Set(["debit", "credit", "unknown"]);

const normalizeString = (value) => String(value ?? "").trim();

const normalizeCategory = (value) => normalizeString(value).toLowerCase();
const normalizeStatus = (value) => normalizeString(value).toLowerCase();
const normalizeTransactionType = (value) =>
  normalizeString(value).toLowerCase();

const normalizeCurrency = (value) =>
  normalizeString(value || "NGN").toUpperCase();

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const parseOptionalMetadata = (value) => {
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

const parseAmount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

export const validateCreateRecordPayload = (body) => {
  const ownerUserId = normalizeString(body?.ownerUserId);
  const category = normalizeCategory(body?.category);
  const className = normalizeString(body?.className);
  const amount = parseAmount(body?.amount);
  const currency = normalizeCurrency(body?.currency);
  const transactionType = normalizeTransactionType(body?.transactionType || "unknown");
  const transactionDate = parseDate(body?.transactionDate);
  const description = normalizeString(body?.description);
  const vendorName = normalizeString(body?.vendorName);
  const customerName = normalizeString(body?.customerName);
  const paymentMethod = normalizeString(body?.paymentMethod);
  const invoiceNumber = normalizeString(body?.invoiceNumber);
  const reference = normalizeString(body?.reference);
  const sourceDocumentId = normalizeString(body?.sourceDocumentId);
  const status = normalizeStatus(body?.status || "draft");
  const metadata = parseOptionalMetadata(body?.metadata);
  const errors = [];

  if (!ownerUserId) {
    errors.push("ownerUserId is required");
  }

  if (!CATEGORIES.has(category)) {
    errors.push("category must be one of: expenses, sales, bank-statements, other");
  }

  if (amount === null) {
    errors.push("amount must be a non-negative number");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.push("currency must be a 3-letter code");
  }

  if (!TRANSACTION_TYPES.has(transactionType)) {
    errors.push("transactionType must be one of: debit, credit, unknown");
  }

  if (!transactionDate) {
    errors.push("transactionDate must be a valid date");
  }

  if (!STATUSES.has(status)) {
    errors.push("status must be one of: draft, posted, archived");
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
      amount,
      currency,
      transactionType,
      transactionDate,
      description,
      vendorName,
      customerName,
      paymentMethod,
      invoiceNumber,
      reference,
      sourceDocumentId: sourceDocumentId || null,
      status,
      metadata: metadata || {}
    }
  };
};

export const buildRecordUpdatePayload = (body) => {
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

  if (body?.category !== undefined) {
    const category = normalizeCategory(body.category);
    if (!CATEGORIES.has(category)) {
      errors.push("category must be one of: expenses, sales, bank-statements, other");
    } else {
      payload.category = category;
    }
  }

  if (body?.className !== undefined) {
    payload.className = normalizeString(body.className);
  }

  if (body?.amount !== undefined) {
    const amount = parseAmount(body.amount);
    if (amount === null) {
      errors.push("amount must be a non-negative number");
    } else {
      payload.amount = amount;
    }
  }

  if (body?.currency !== undefined) {
    const currency = normalizeCurrency(body.currency);
    if (!/^[A-Z]{3}$/.test(currency)) {
      errors.push("currency must be a 3-letter code");
    } else {
      payload.currency = currency;
    }
  }

  if (body?.transactionType !== undefined) {
    const transactionType = normalizeTransactionType(body.transactionType);
    if (!TRANSACTION_TYPES.has(transactionType)) {
      errors.push("transactionType must be one of: debit, credit, unknown");
    } else {
      payload.transactionType = transactionType;
    }
  }

  if (body?.transactionDate !== undefined) {
    const transactionDate = parseDate(body.transactionDate);
    if (!transactionDate) {
      errors.push("transactionDate must be a valid date");
    } else {
      payload.transactionDate = transactionDate;
    }
  }

  if (body?.description !== undefined) {
    payload.description = normalizeString(body.description);
  }

  if (body?.vendorName !== undefined) {
    payload.vendorName = normalizeString(body.vendorName);
  }

  if (body?.customerName !== undefined) {
    payload.customerName = normalizeString(body.customerName);
  }

  if (body?.paymentMethod !== undefined) {
    payload.paymentMethod = normalizeString(body.paymentMethod);
  }

  if (body?.invoiceNumber !== undefined) {
    payload.invoiceNumber = normalizeString(body.invoiceNumber);
  }

  if (body?.reference !== undefined) {
    payload.reference = normalizeString(body.reference);
  }

  if (body?.sourceDocumentId !== undefined) {
    const sourceDocumentId = normalizeString(body.sourceDocumentId);
    payload.sourceDocumentId = sourceDocumentId || null;
  }

  if (body?.status !== undefined) {
    const status = normalizeStatus(body.status);
    if (!STATUSES.has(status)) {
      errors.push("status must be one of: draft, posted, archived");
    } else {
      payload.status = status;
    }
  }

  if (body?.metadata !== undefined) {
    const metadata = parseOptionalMetadata(body.metadata);
    if (!metadata) {
      errors.push("metadata must be a valid JSON object");
    } else {
      payload.metadata = metadata;
    }
  }

  return { payload, errors };
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

export const validateListRecordQuery = (query, actor) => {
  const ownerUserId = normalizeString(query?.ownerUserId);
  const category = normalizeCategory(query?.category);
  const status = normalizeStatus(query?.status);
  const className = normalizeString(query?.className);
  const search = normalizeString(query?.search);
  const dateFrom = parseDate(query?.dateFrom);
  const dateTo = parseDate(query?.dateTo);
  const limit = parsePositiveInt(query?.limit, 50);
  const skip = parsePositiveInt(query?.skip, 0);
  const errors = [];

  if (category && !CATEGORIES.has(category)) {
    errors.push("category must be one of: expenses, sales, bank-statements, other");
  }

  if (status && !STATUSES.has(status)) {
    errors.push("status must be one of: draft, posted, archived");
  }

  if (query?.dateFrom !== undefined && !dateFrom) {
    errors.push("dateFrom must be a valid date");
  }
  if (query?.dateTo !== undefined && !dateTo) {
    errors.push("dateTo must be a valid date");
  }

  return {
    errors,
    payload: {
      ownerUserId: ownerUserId || actor.uid,
      category: category || "",
      status: status || "",
      className,
      search,
      dateFrom,
      dateTo,
      limit: Math.min(Math.max(1, limit), 200),
      skip
    }
  };
};

export const validateSummaryQuery = (query, actor) => {
  const ownerUserId = normalizeString(query?.ownerUserId);
  const category = normalizeCategory(query?.category);
  const status = normalizeStatus(query?.status);
  const dateFrom = parseDate(query?.dateFrom);
  const dateTo = parseDate(query?.dateTo);
  const errors = [];

  if (category && !CATEGORIES.has(category)) {
    errors.push("category must be one of: expenses, sales, bank-statements, other");
  }

  if (status && !STATUSES.has(status)) {
    errors.push("status must be one of: draft, posted, archived");
  }

  if (query?.dateFrom !== undefined && !dateFrom) {
    errors.push("dateFrom must be a valid date");
  }
  if (query?.dateTo !== undefined && !dateTo) {
    errors.push("dateTo must be a valid date");
  }

  return {
    errors,
    payload: {
      ownerUserId: ownerUserId || actor.uid,
      category: category || "",
      status: status || "",
      dateFrom,
      dateTo
    }
  };
};
