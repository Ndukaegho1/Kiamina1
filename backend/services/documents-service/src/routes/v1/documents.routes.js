import express from "express";
import {
  createOne,
  getById,
  listByOwner,
  putById,
  removeById,
  updateStatus
} from "../../controllers/documents.controller.js";

const router = express.Router();

router.post("/", createOne);
router.get("/owner/:ownerUserId", listByOwner);
router.get("/:id", getById);
router.put("/:id", putById);
router.patch("/:id/status", updateStatus);
router.delete("/:id", removeById);

export default router;
