import express from "express";
import { sendOtp, verifyOtp, verifyToken } from "../../controllers/auth.controller.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/verify-token", verifyToken);

export default router;
