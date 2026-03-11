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

const dispatchEmailMessage = async ({ email, subject, message }) => {
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
          subject,
          message
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

const OTP_PURPOSE_LABELS = {
  login: "Login verification",
  "client-login": "Client login verification",
  "admin-login": "Admin login verification",
  signup: "Account signup verification",
  "admin-setup": "Admin setup verification",
  "password-reset": "Password reset verification",
  "sms-verification": "Phone verification",
  onboarding: "Onboarding verification"
};

export const dispatchPasswordResetLink = async ({ email, resetLink }) =>
  dispatchEmailMessage({
    email,
    subject: "Reset your Kiamina password",
    message: `Use this secure link to reset your password: ${resetLink}`
  });

export const dispatchEmailVerificationLink = async ({
  email,
  verificationLink
}) =>
  dispatchEmailMessage({
    email,
    subject: "Verify your Kiamina email address",
    message: [
      "Verify your email address to activate your Kiamina client account.",
      "",
      `Verification link: ${verificationLink}`,
      "",
      "If you did not create this account, you can ignore this email."
    ].join("\n")
  });

export const dispatchOtpEmail = async ({ email, otp, purpose, expiryMinutes }) => {
  const normalizedPurpose = String(purpose || "").trim().toLowerCase();
  const purposeLabel =
    OTP_PURPOSE_LABELS[normalizedPurpose] || OTP_PURPOSE_LABELS.login;
  const normalizedExpiry = Number.isFinite(Number(expiryMinutes))
    ? Math.max(1, Number(expiryMinutes))
    : Math.max(1, Number(env.otpExpiryMinutes || 10));

  return dispatchEmailMessage({
    email,
    subject: "Your Kiamina verification code",
    message: [
      `Use this one-time code to complete your request (${purposeLabel}).`,
      "",
      `OTP: ${otp}`,
      `Expires in ${normalizedExpiry} minute${normalizedExpiry === 1 ? "" : "s"}.`,
      "",
      "If you did not request this code, you can ignore this email."
    ].join("\n")
  });
};
