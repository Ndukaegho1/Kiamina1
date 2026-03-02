import express from "express";
import {
  createTicket,
  getTicketById,
  listTicketMessages,
  listTickets,
  patchTicket,
  postTicketMessage
} from "../../controllers/support.controller.js";

const router = express.Router();

router.post("/tickets", createTicket);
router.get("/tickets", listTickets);
router.get("/tickets/:ticketId", getTicketById);
router.patch("/tickets/:ticketId", patchTicket);
router.get("/tickets/:ticketId/messages", listTicketMessages);
router.post("/tickets/:ticketId/messages", postTicketMessage);

export default router;
