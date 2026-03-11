import express from "express";
import {
  createAnonymousTicket,
  createTicket,
  getTicketById,
  listAnonymousTicketMessages,
  listAnonymousTickets,
  listTicketMessages,
  listTickets,
  patchTicket,
  postAnonymousTicketMessage,
  postTicketMessage
} from "../../controllers/support.controller.js";

const router = express.Router();

router.post("/public/tickets", createAnonymousTicket);
router.get("/public/tickets", listAnonymousTickets);
router.get("/public/tickets/:ticketId/messages", listAnonymousTicketMessages);
router.post("/public/tickets/:ticketId/messages", postAnonymousTicketMessage);

router.post("/tickets", createTicket);
router.get("/tickets", listTickets);
router.get("/tickets/:ticketId", getTicketById);
router.patch("/tickets/:ticketId", patchTicket);
router.get("/tickets/:ticketId/messages", listTicketMessages);
router.post("/tickets/:ticketId/messages", postTicketMessage);

export default router;
