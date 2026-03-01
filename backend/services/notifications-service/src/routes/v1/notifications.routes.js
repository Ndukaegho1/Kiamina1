import express from "express";
import {
  listLogs,
  patchLogStatus,
  sendEmail
} from "../../controllers/notifications.controller.js";

const router = express.Router();

router.post("/send-email", sendEmail);
router.get("/logs", listLogs);
router.patch("/logs/:id/status", patchLogStatus);

export default router;
