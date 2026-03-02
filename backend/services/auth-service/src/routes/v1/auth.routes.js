import express from "express";
import {
  logoutSession,
  recordLoginSession,
  registerAccount,
  sendOtp,
  verifyOtp,
  verifyToken
} from "../../controllers/auth.controller.js";

const router = express.Router();

router.post("/register-account", registerAccount);
router.post("/login-session", recordLoginSession);
router.post("/logout-session", logoutSession);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/verify-token", verifyToken);

export default router;
