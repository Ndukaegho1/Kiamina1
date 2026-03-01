import express from "express";
import {
  createOne,
  getById,
  list,
  putById,
  removeById,
  summary
} from "../../controllers/accounting-records.controller.js";

const router = express.Router();

router.post("/", createOne);
router.get("/", list);
router.get("/summary", summary);
router.get("/:id", getById);
router.put("/:id", putById);
router.delete("/:id", removeById);

export default router;
