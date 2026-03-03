import express from "express";
import { publishEvent, streamEvents } from "../../controllers/realtime-events.controller.js";

const router = express.Router();

router.get("/stream", streamEvents);
router.post("/publish", publishEvent);

export default router;
