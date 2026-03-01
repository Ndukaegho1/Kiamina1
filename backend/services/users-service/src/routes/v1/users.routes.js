import express from "express";
import { getById, getMe, syncFromAuth } from "../../controllers/users.controller.js";

const router = express.Router();

router.post("/sync-from-auth", syncFromAuth);
router.get("/me", getMe);
router.get("/:id", getById);

export default router;
