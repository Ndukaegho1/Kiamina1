import { env } from "../config/env.js";

const SYSTEM_ACTOR_HEADERS = {
  "x-user-id": "system-auth-service",
  "x-user-email": "no-reply@kiamina.local",
  "x-user-roles": "superadmin"
};

const withTimeout = async (operation) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), env.notificationsServiceTimeoutMs);

  try {
    return await operation(abortController.signal);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const dispatchPasswordResetLink = async ({ email, resetLink }) => {
  if (!env.notificationsServiceUrl) {
    return {
      queued: false,
      reason: "notifications-service-url-not-configured"
    };
  }

  try {
    const response = await withTimeout((signal) =>
      fetch(`${env.notificationsServiceUrl}/api/v1/notifications/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...SYSTEM_ACTOR_HEADERS
        },
        body: JSON.stringify({
          to: [email],
          subject: "Reset your Kiamina password",
          message: `Use this secure link to reset your password: ${resetLink}`
        }),
        signal
      })
    );

    if (!response.ok) {
      return {
        queued: false,
        reason: `notification-service-status-${response.status}`
      };
    }

    return {
      queued: true
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return {
        queued: false,
        reason: "notification-request-timeout"
      };
    }

    return {
      queued: false,
      reason: "notification-request-failed"
    };
  }
};
