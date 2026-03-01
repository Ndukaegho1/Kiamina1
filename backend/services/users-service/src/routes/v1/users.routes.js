import express from "express";
import {
  getById,
  getMe,
  putById,
  removeById,
  syncFromAuth
} from "../../controllers/users.controller.js";

const router = express.Router();

router.post("/sync-from-auth", syncFromAuth);
router.get("/me", getMe);
router.get("/:id", getById);
router.put("/:id", putById);
router.delete("/:id", removeById);

export default router;
