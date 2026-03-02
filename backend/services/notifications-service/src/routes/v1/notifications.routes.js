import express from "express";
import {
  deleteLog,
  listLogs,
  putLog,
  patchLogStatus,
  sendEmail
} from "../../controllers/notifications.controller.js";
import supportRoutes from "./support.routes.js";
import chatbotRoutes from "./chatbot.routes.js";
import knowledgeBaseRoutes from "./knowledge-base.routes.js";

const router = express.Router();

router.post("/send-email", sendEmail);
router.get("/logs", listLogs);
router.put("/logs/:id", putLog);
router.patch("/logs/:id/status", patchLogStatus);
router.delete("/logs/:id", deleteLog);
router.use("/support", supportRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/knowledge-base", knowledgeBaseRoutes);

export default router;
