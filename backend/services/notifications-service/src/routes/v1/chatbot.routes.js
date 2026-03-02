import express from "express";
import {
  createSession,
  escalateSession,
  getSessionById,
  listSessionMessages,
  listSessions,
  postSessionMessage
} from "../../controllers/chatbot.controller.js";

const router = express.Router();

router.post("/sessions", createSession);
router.get("/sessions", listSessions);
router.get("/sessions/:sessionId", getSessionById);
router.get("/sessions/:sessionId/messages", listSessionMessages);
router.post("/sessions/:sessionId/messages", postSessionMessage);
router.post("/sessions/:sessionId/escalate", escalateSession);

export default router;
