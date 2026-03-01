import { NotificationLog } from "../models/NotificationLog.model.js";

export const createNotificationLog = async (payload) =>
  NotificationLog.create(payload);

export const listNotificationLogs = async (limit = 50) =>
  NotificationLog.find().sort({ createdAt: -1 }).limit(limit);

export const updateNotificationLog = async (id, payload) =>
  NotificationLog.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

export const deleteNotificationLog = async (id) =>
  NotificationLog.findByIdAndDelete(id);
