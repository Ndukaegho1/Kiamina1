import Joi from "joi";

const CATEGORIES = ["expenses", "sales", "bank-statements", "other"];
const STATUSES = ["draft", "posted", "archived"];
const TRANSACTION_TYPES = ["debit", "credit", "unknown"];

const normalizeString = (value) => String(value ?? "").trim();
const normalizeSource = (body) =>
  body && typeof body === "object" && !Array.isArray(body) ? body : {};

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

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = normalizeString(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
};

const parseYear = (value, fallbackYear) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return fallbackYear;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1970 || parsed > 2200) {
    return null;
  }
  return parsed;
};

const parseMonth = (value, fallbackMonth) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return fallbackMonth;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
    return null;
  }
  return parsed;
};

const buildMonthDateRange = ({ year, month }) => {
  if (!year || !month) {
    return { dateFrom: null, dateTo: null };
  }

  const dateFrom = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const dateTo = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { dateFrom, dateTo };
};

const categorySchema = Joi.string().valid(...CATEGORIES);
const statusSchema = Joi.string().valid(...STATUSES);
const transactionTypeSchema = Joi.string().valid(...TRANSACTION_TYPES);
const currencySchema = Joi.string().pattern(/^[A-Z]{3}$/);
const amountSchema = Joi.number().min(0);
const timezoneSchema = Joi.string().max(64);
const ownerRequiredSchema = Joi.string().trim().required();
const ownerOptionalSchema = Joi.string().trim().allow("");

export const validateCreateRecordPayload = (
  body,
  { requireOwnerUserId = true } = {}
) => {
  const source = normalizeSource(body);

  const ownerUserId = normalizeString(source.ownerUserId);
  const category = normalizeCategory(source.category);
  const className = normalizeString(source.className);
  const amount = parseAmount(source.amount);
  const currency = normalizeCurrency(source.currency);
  const transactionType = normalizeTransactionType(source.transactionType || "unknown");
  const transactionDate = parseDate(source.transactionDate);
  const description = normalizeString(source.description);
  const vendorName = normalizeString(source.vendorName);
  const customerName = normalizeString(source.customerName);
  const paymentMethod = normalizeString(source.paymentMethod);
  const invoiceNumber = normalizeString(source.invoiceNumber);
  const reference = normalizeString(source.reference);
  const sourceDocumentId = normalizeString(source.sourceDocumentId);
  const status = normalizeStatus(source.status || "draft");
  const metadata = parseOptionalMetadata(source.metadata);
  const errors = [];

  const ownerValidation = requireOwnerUserId
    ? ownerRequiredSchema.validate(ownerUserId)
    : ownerOptionalSchema.validate(ownerUserId);
  if (ownerValidation.error) {
    errors.push("ownerUserId is required");
  }

  if (categorySchema.validate(category).error) {
    errors.push("category must be one of: expenses, sales, bank-statements, other");
  }

  if (amountSchema.validate(amount).error) {
    errors.push("amount must be a non-negative number");
  }

  if (currencySchema.validate(currency).error) {
    errors.push("currency must be a 3-letter code");
  }

  if (transactionTypeSchema.validate(transactionType).error) {
    errors.push("transactionType must be one of: debit, credit, unknown");
  }

  if (!transactionDate) {
    errors.push("transactionDate must be a valid date");
  }

  if (statusSchema.validate(status).error) {
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
  const source = normalizeSource(body);
  const payload = {};
  const errors = [];

  if (source.ownerUserId !== undefined) {
    const ownerUserId = normalizeString(source.ownerUserId);
    if (ownerRequiredSchema.validate(ownerUserId).error) {
      errors.push("ownerUserId cannot be empty");
    } else {
      payload.ownerUserId = ownerUserId;
    }
  }

  if (source.category !== undefined) {
    const category = normalizeCategory(source.category);
    if (categorySchema.validate(category).error) {
      errors.push("category must be one of: expenses, sales, bank-statements, other");
    } else {
      payload.category = category;
    }
  }

  if (source.className !== undefined) {
    payload.className = normalizeString(source.className);
  }

  if (source.amount !== undefined) {
    const amount = parseAmount(source.amount);
    if (amountSchema.validate(amount).error) {
      errors.push("amount must be a non-negative number");
    } else {
      payload.amount = amount;
    }
  }

  if (source.currency !== undefined) {
    const currency = normalizeCurrency(source.currency);
    if (currencySchema.validate(currency).error) {
      errors.push("currency must be a 3-letter code");
    } else {
      payload.currency = currency;
    }
  }

  if (source.transactionType !== undefined) {
    const transactionType = normalizeTransactionType(source.transactionType);
    if (transactionTypeSchema.validate(transactionType).error) {
      errors.push("transactionType must be one of: debit, credit, unknown");
    } else {
      payload.transactionType = transactionType;
    }
  }

  if (source.transactionDate !== undefined) {
    const transactionDate = parseDate(source.transactionDate);
    if (!transactionDate) {
      errors.push("transactionDate must be a valid date");
    } else {
      payload.transactionDate = transactionDate;
    }
  }

  if (source.description !== undefined) {
    payload.description = normalizeString(source.description);
  }

  if (source.vendorName !== undefined) {
    payload.vendorName = normalizeString(source.vendorName);
  }

  if (source.customerName !== undefined) {
    payload.customerName = normalizeString(source.customerName);
  }

  if (source.paymentMethod !== undefined) {
    payload.paymentMethod = normalizeString(source.paymentMethod);
  }

  if (source.invoiceNumber !== undefined) {
    payload.invoiceNumber = normalizeString(source.invoiceNumber);
  }

  if (source.reference !== undefined) {
    payload.reference = normalizeString(source.reference);
  }

  if (source.sourceDocumentId !== undefined) {
    const sourceDocumentId = normalizeString(source.sourceDocumentId);
    payload.sourceDocumentId = sourceDocumentId || null;
  }

  if (source.status !== undefined) {
    const status = normalizeStatus(source.status);
    if (statusSchema.validate(status).error) {
      errors.push("status must be one of: draft, posted, archived");
    } else {
      payload.status = status;
    }
  }

  if (source.metadata !== undefined) {
    const metadata = parseOptionalMetadata(source.metadata);
    if (!metadata) {
      errors.push("metadata must be a valid JSON object");
    } else {
      payload.metadata = metadata;
    }
  }

  return { payload, errors };
};

export const validateListRecordQuery = (query, actor) => {
  const source = normalizeSource(query);

  const ownerUserId = normalizeString(source.ownerUserId);
  const category = normalizeCategory(source.category);
  const status = normalizeStatus(source.status);
  const className = normalizeString(source.className);
  const search = normalizeString(source.search);
  const dateFrom = parseDate(source.dateFrom);
  const dateTo = parseDate(source.dateTo);
  const limit = parsePositiveInt(source.limit, 50);
  const skip = parsePositiveInt(source.skip, 0);
  const errors = [];

  if (category && categorySchema.validate(category).error) {
    errors.push("category must be one of: expenses, sales, bank-statements, other");
  }

  if (status && statusSchema.validate(status).error) {
    errors.push("status must be one of: draft, posted, archived");
  }

  if (source.dateFrom !== undefined && !dateFrom) {
    errors.push("dateFrom must be a valid date");
  }
  if (source.dateTo !== undefined && !dateTo) {
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
  const source = normalizeSource(query);

  const ownerUserId = normalizeString(source.ownerUserId);
  const category = normalizeCategory(source.category);
  const status = normalizeStatus(source.status);
  const dateFrom = parseDate(source.dateFrom);
  const dateTo = parseDate(source.dateTo);
  const errors = [];

  if (category && categorySchema.validate(category).error) {
    errors.push("category must be one of: expenses, sales, bank-statements, other");
  }

  if (status && statusSchema.validate(status).error) {
    errors.push("status must be one of: draft, posted, archived");
  }

  if (source.dateFrom !== undefined && !dateFrom) {
    errors.push("dateFrom must be a valid date");
  }
  if (source.dateTo !== undefined && !dateTo) {
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

export const validateImportRecordPayload = (body, actor) => {
  const source = normalizeSource(body);

  const ownerUserId = normalizeString(source.ownerUserId) || actor.uid;
  const category = normalizeCategory(source.category);
  const status = normalizeStatus(source.status || "draft");
  const transactionType = normalizeTransactionType(
    source.transactionType || "unknown"
  );
  const currency = normalizeCurrency(source.currency || "NGN");
  const dryRun = parseBoolean(source.dryRun, false);
  const errors = [];

  if (category && categorySchema.validate(category).error) {
    errors.push("category must be one of: expenses, sales, bank-statements, other");
  }

  if (status && statusSchema.validate(status).error) {
    errors.push("status must be one of: draft, posted, archived");
  }

  if (transactionType && transactionTypeSchema.validate(transactionType).error) {
    errors.push("transactionType must be one of: debit, credit, unknown");
  }

  if (currencySchema.validate(currency).error) {
    errors.push("currency must be a 3-letter code");
  }

  return {
    errors,
    payload: {
      ownerUserId,
      category: category || "",
      status: status || "draft",
      transactionType: transactionType || "unknown",
      currency,
      dryRun
    }
  };
};

export const validateMonthlyReportQuery = (query, actor) => {
  const source = normalizeSource(query);

  const ownerUserId = normalizeString(source.ownerUserId) || actor.uid;
  const category = normalizeCategory(source.category);
  const status = normalizeStatus(source.status);
  const timezone = normalizeString(source.timezone || "UTC") || "UTC";
  const explicitDateFrom = parseDate(source.dateFrom);
  const explicitDateTo = parseDate(source.dateTo);
  const now = new Date();
  const year = parseYear(source.year, now.getUTCFullYear());
  const month = parseMonth(source.month, now.getUTCMonth() + 1);
  const errors = [];

  if (category && categorySchema.validate(category).error) {
    errors.push("category must be one of: expenses, sales, bank-statements, other");
  }

  if (status && statusSchema.validate(status).error) {
    errors.push("status must be one of: draft, posted, archived");
  }

  if (source.dateFrom !== undefined && !explicitDateFrom) {
    errors.push("dateFrom must be a valid date");
  }
  if (source.dateTo !== undefined && !explicitDateTo) {
    errors.push("dateTo must be a valid date");
  }
  if (!year) {
    errors.push("year must be an integer between 1970 and 2200");
  }
  if (!month) {
    errors.push("month must be an integer between 1 and 12");
  }
  if (timezoneSchema.validate(timezone).error) {
    errors.push("timezone cannot be longer than 64 characters");
  }

  const monthRange = buildMonthDateRange({ year, month });
  const dateFrom = explicitDateFrom || monthRange.dateFrom;
  const dateTo = explicitDateTo || monthRange.dateTo;

  return {
    errors,
    payload: {
      ownerUserId,
      category: category || "",
      status: status || "",
      timezone,
      year,
      month,
      dateFrom,
      dateTo
    }
  };
};
