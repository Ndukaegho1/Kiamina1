const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHANNELS = new Set(["email", "sms", "push", "webhook"]);
const STATUSES = new Set(["queued", "sent", "failed"]);

const normalizeString = (value) => String(value ?? "").trim();

const normalizeEmailList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((email) => normalizeString(email).toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }

  return null;
};

const normalizeDate = (value) => {
  if (value === null) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const validateSendEmailPayload = (body) => {
  const to = normalizeEmailList(body?.to);
  const subject = body?.subject === undefined ? "" : normalizeString(body.subject);
  const message = normalizeString(body?.message);
  const errors = [];

  if (!to || to.length === 0) {
    errors.push("to must be a valid email or comma-separated list of emails");
  } else if (to.some((email) => !EMAIL_REGEX.test(email))) {
    errors.push("to contains invalid email addresses");
  }

  if (!message) {
    errors.push("message is required");
  } else if (message.length > 5000) {
    errors.push("message must be at most 5000 characters");
  }

  if (subject.length > 200) {
    errors.push("subject must be at most 200 characters");
  }

  return {
    errors,
    payload: {
      to: to || [],
      subject,
      message
    }
  };
};

export const validatePatchStatusPayload = (body) => {
  const status = normalizeString(body?.status).toLowerCase();
  const errorMessage =
    body?.errorMessage === undefined ? undefined : normalizeString(body.errorMessage);

  if (!status) {
    return { error: "status is required" };
  }

  if (!STATUSES.has(status)) {
    return { error: "status must be one of: queued, sent, failed" };
  }

  if (errorMessage !== undefined && errorMessage.length > 500) {
    return { error: "errorMessage must be at most 500 characters" };
  }

  return {
    status,
    errorMessage
  };
};

export const buildNotificationLogUpdatePayload = (body) => {
  const payload = {};
  const errors = [];

  if (body?.channel !== undefined) {
    const channel = normalizeString(body.channel).toLowerCase();
    if (!CHANNELS.has(channel)) {
      errors.push("channel must be one of: email, sms, push, webhook");
    } else {
      payload.channel = channel;
    }
  }

  if (body?.to !== undefined) {
    const to = normalizeEmailList(body.to);
    if (!to || to.length === 0 || to.some((email) => !EMAIL_REGEX.test(email))) {
      errors.push("to must contain valid email addresses");
    } else {
      payload.to = to.join(",");
    }
  }

  if (body?.subject !== undefined) {
    const subject = normalizeString(body.subject);
    if (subject.length > 200) {
      errors.push("subject must be at most 200 characters");
    } else {
      payload.subject = subject;
    }
  }

  if (body?.message !== undefined) {
    const message = normalizeString(body.message);
    if (!message) {
      errors.push("message cannot be empty");
    } else if (message.length > 5000) {
      errors.push("message must be at most 5000 characters");
    } else {
      payload.message = message;
    }
  }

  if (body?.status !== undefined) {
    const status = normalizeString(body.status).toLowerCase();
    if (!STATUSES.has(status)) {
      errors.push("status must be one of: queued, sent, failed");
    } else {
      payload.status = status;
    }
  }

  if (body?.providerMessageId !== undefined) {
    const providerMessageId = normalizeString(body.providerMessageId);
    if (providerMessageId.length > 255) {
      errors.push("providerMessageId must be at most 255 characters");
    } else {
      payload.providerMessageId = providerMessageId;
    }
  }

  if (body?.scheduledAt !== undefined) {
    const scheduledAt = normalizeDate(body.scheduledAt);
    if (scheduledAt === null && body.scheduledAt !== null) {
      errors.push("scheduledAt must be a valid date");
    } else {
      payload.scheduledAt = scheduledAt;
    }
  }

  if (body?.sentAt !== undefined) {
    const sentAt = normalizeDate(body.sentAt);
    if (sentAt === null && body.sentAt !== null) {
      errors.push("sentAt must be a valid date");
    } else {
      payload.sentAt = sentAt;
    }
  }

  if (body?.errorMessage !== undefined) {
    const errorMessage = normalizeString(body.errorMessage);
    if (errorMessage.length > 500) {
      errors.push("errorMessage must be at most 500 characters");
    } else {
      payload.errorMessage = errorMessage;
    }
  }

  return { payload, errors };
};
