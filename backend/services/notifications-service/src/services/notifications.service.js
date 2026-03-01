import {
  createNotificationLog,
  listNotificationLogs,
  updateNotificationLog
} from "../repositories/notifications.repository.js";
import { publishToQstash } from "./qstash.service.js";

export const queueEmailNotification = async ({ to, subject, message }) => {
  const log = await createNotificationLog({
    channel: "email",
    to,
    subject: subject || "",
    message,
    status: "queued"
  });

  try {
    const publishResult = await publishToQstash({
      logId: log.id,
      channel: "email",
      to,
      subject,
      message
    });

    if (publishResult.published) {
      const updated = await updateNotificationLog(log.id, {
        providerMessageId: publishResult.messageId
      });
      return updated;
    }
  } catch (error) {
    await updateNotificationLog(log.id, {
      status: "failed",
      errorMessage: error.message
    });
    throw error;
  }

  return log;
};

export const getRecentNotificationLogs = async (limit) => listNotificationLogs(limit);

export const updateNotificationStatus = async ({ id, status, errorMessage }) => {
  const payload = {
    status
  };

  if (status === "sent") {
    payload.sentAt = new Date();
  }

  if (errorMessage) {
    payload.errorMessage = errorMessage;
  }

  return updateNotificationLog(id, payload);
};
