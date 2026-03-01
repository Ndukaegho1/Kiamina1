import {
  getRecentNotificationLogs,
  queueEmailNotification,
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
