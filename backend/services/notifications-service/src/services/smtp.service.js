import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter;

const isConfigured = () =>
  Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.smtpFromEmail);

const getTransporter = () => {
  if (!isConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      requireTLS: env.smtpRequireTls,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    });
  }

  return transporter;
};

export const sendEmailViaSmtp = async ({ to, subject, message }) => {
  const smtpTransporter = getTransporter();
  if (!smtpTransporter) {
    return {
      sent: false,
      reason: "SMTP not configured"
    };
  }

  const info = await smtpTransporter.sendMail({
    from: env.smtpFromName
      ? `"${env.smtpFromName}" <${env.smtpFromEmail}>`
      : env.smtpFromEmail,
    to: Array.isArray(to) ? to.join(",") : String(to),
    subject: subject || "Kiamina Notification",
    text: message
  });

  return {
    sent: true,
    provider: "smtp",
    messageId: info.messageId || ""
  };
};
