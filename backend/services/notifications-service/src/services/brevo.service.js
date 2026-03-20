import { env } from "../config/env.js";

const isConfigured = () => Boolean(env.brevoApiKey && env.brevoSenderEmail);

const withTimeout = async (operation) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), env.brevoApiTimeoutMs);

  try {
    return await operation(abortController.signal);
  } finally {
    clearTimeout(timeoutId);
  }
};

const toRecipients = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .map((email) => ({ email }));
  }

  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
};

const buildFailureMessage = async (response) => {
  try {
    const payload = await response.json();
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
  } catch {
    // Ignore JSON parse errors and use fallback message.
  }

  return `Brevo API request failed with status ${response.status}`;
};

export const sendEmailViaBrevo = async ({ to, subject, message }) => {
  if (!isConfigured()) {
    return {
      sent: false,
      attempted: false,
      reason: "brevo-api-not-configured"
    };
  }

  const recipients = toRecipients(to);
  if (recipients.length === 0) {
    return {
      sent: false,
      attempted: false,
      reason: "brevo-invalid-recipient"
    };
  }

  try {
    const response = await withTimeout((signal) =>
      fetch(`${env.brevoApiBaseUrl.replace(/\/$/, "")}/smtp/email`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": env.brevoApiKey
        },
        body: JSON.stringify({
          sender: {
            email: env.brevoSenderEmail,
            name: env.brevoSenderName || "Kiamina"
          },
          to: recipients,
          subject: subject || "Kiamina Notification",
          textContent: String(message || "")
        }),
        signal
      })
    );

    if (!response.ok) {
      const errorMessage = await buildFailureMessage(response);
      return {
        sent: false,
        attempted: true,
        reason: `brevo-api-status-${response.status}`,
        errorMessage
      };
    }

    const payload = await response.json();
    return {
      sent: true,
      attempted: true,
      provider: "brevo",
      messageId: payload?.messageId || ""
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return {
        sent: false,
        attempted: true,
        reason: "brevo-api-timeout",
        errorMessage: "Brevo API request timed out."
      };
    }

    return {
      sent: false,
      attempted: true,
      reason: "brevo-api-request-failed",
      errorMessage: error?.message || "Brevo API request failed."
    };
  }
};
