import express from "express";
import {
  logoutSession,
  refreshToken,
  recordLoginSession,
  registerAccount,
  sendPasswordResetLink,
  sendOtp,
  sendSmsOtp,
  verifyOtp,
  verifySmsOtp,
  verifyToken
} from "../../controllers/auth.controller.js";

const router = express.Router();

router.post("/register-account", registerAccount);
router.post("/login-session", recordLoginSession);
router.post("/logout-session", logoutSession);
router.post("/refresh-token", refreshToken);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/send-password-reset-link", sendPasswordResetLink);
router.post("/send-sms-otp", sendSmsOtp);
router.post("/verify-sms-otp", verifySmsOtp);
router.post("/verify-token", verifyToken);

export default router;
