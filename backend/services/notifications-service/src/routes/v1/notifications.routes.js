import express from "express";
import {
  deleteLog,
  listLogs,
  putLog,
  patchLogStatus,
  sendEmail
} from "../../controllers/notifications.controller.js";

const router = express.Router();

router.post("/send-email", sendEmail);
router.get("/logs", listLogs);
router.put("/logs/:id", putLog);
router.patch("/logs/:id/status", patchLogStatus);
router.delete("/logs/:id", deleteLog);

export default router;
