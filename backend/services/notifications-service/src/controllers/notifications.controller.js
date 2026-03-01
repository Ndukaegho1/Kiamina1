import {
  getRecentNotificationLogs,
  queueEmailNotification,
  removeNotificationLog,
  replaceNotificationLog,
  updateNotificationStatus
} from "../services/notifications.service.js";

export const sendEmail = async (req, res, next) => {
  try {
    const { to, subject, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ message: "to and message are required" });
    }

    const log = await queueEmailNotification({ to, subject, message });
    return res.status(202).json({
      message: "Notification queued.",
      log
    });
  } catch (error) {
    return next(error);
  }
};

export const listLogs = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 50);
    const logs = await getRecentNotificationLogs(limit);
    return res.status(200).json(logs);
  } catch (error) {
    return next(error);
  }
};

export const patchLogStatus = async (req, res, next) => {
  try {
    const { status, errorMessage } = req.body;
    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    const updated = await updateNotificationStatus({
      id: req.params.id,
      status,
      errorMessage
    });

    if (!updated) {
      return res.status(404).json({ message: "Notification log not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const putLog = async (req, res, next) => {
  try {
    const {
      channel,
      to,
      subject,
      message,
      status,
      providerMessageId,
      scheduledAt,
      sentAt,
      errorMessage
    } = req.body;
    const payload = {};

    if (channel !== undefined) {
      payload.channel = channel;
    }
    if (to !== undefined) {
      payload.to = to;
    }
    if (subject !== undefined) {
      payload.subject = subject;
    }
    if (message !== undefined) {
      payload.message = message;
    }
    if (status !== undefined) {
      payload.status = status;
    }
    if (providerMessageId !== undefined) {
      payload.providerMessageId = providerMessageId;
    }
    if (scheduledAt !== undefined) {
      payload.scheduledAt = scheduledAt;
    }
    if (sentAt !== undefined) {
      payload.sentAt = sentAt;
    }
    if (errorMessage !== undefined) {
      payload.errorMessage = errorMessage;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one field to update: channel, to, subject, message, status, providerMessageId, scheduledAt, sentAt, errorMessage"
      });
    }

    const updated = await replaceNotificationLog({
      id: req.params.id,
      payload
    });

    if (!updated) {
      return res.status(404).json({ message: "Notification log not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const deleteLog = async (req, res, next) => {
  try {
    const deleted = await removeNotificationLog(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Notification log not found" });
    }

    return res.status(200).json({
      message: "Notification log deleted successfully.",
      id: deleted.id
    });
  } catch (error) {
    return next(error);
  }
};
