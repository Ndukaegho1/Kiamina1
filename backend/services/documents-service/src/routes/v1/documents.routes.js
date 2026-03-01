import express from "express";
import {
  createOne,
  getById,
  listByOwner,
  updateStatus
} from "../../controllers/documents.controller.js";

const router = express.Router();

router.post("/", createOne);
router.get("/owner/:ownerUserId", listByOwner);
router.get("/:id", getById);
router.patch("/:id/status", updateStatus);

export default router;
