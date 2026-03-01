import express from "express";
import {
  createOne,
  getDownloadUrl,
  getById,
  listByOwner,
  putById,
  removeById,
  uploadOne,
  updateStatus
} from "../../controllers/documents.controller.js";
import { singleDocumentUploadMiddleware } from "../../middleware/upload.js";
import accountingRecordsRoutes from "./accounting-records.routes.js";

const router = express.Router();

router.use("/records", accountingRecordsRoutes);
router.post("/", createOne);
router.post("/upload", singleDocumentUploadMiddleware, uploadOne);
router.get("/owner/:ownerUserId", listByOwner);
router.get("/:id/download-url", getDownloadUrl);
router.get("/:id", getById);
router.put("/:id", putById);
router.patch("/:id/status", updateStatus);
router.delete("/:id", removeById);

export default router;
