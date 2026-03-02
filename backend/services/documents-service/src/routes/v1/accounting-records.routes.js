import express from "express";
import {
  createOne,
  getById,
  importBulk,
  list,
  monthlyCashflow,
  monthlyProfitLoss,
  putById,
  removeById,
  summary
} from "../../controllers/accounting-records.controller.js";
import { singleRecordsImportUploadMiddleware } from "../../middleware/upload.js";

const router = express.Router();

router.post("/", createOne);
router.post("/import", singleRecordsImportUploadMiddleware, importBulk);
router.get("/", list);
router.get("/summary", summary);
router.get("/reports/profit-loss", monthlyProfitLoss);
router.get("/reports/cashflow", monthlyCashflow);
router.get("/:id", getById);
router.put("/:id", putById);
router.delete("/:id", removeById);

export default router;
