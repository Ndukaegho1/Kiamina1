import express from "express";
import {
  authenticatePassword,
  changePassword,
  deleteAccount,
  deleteAccountByUid,
  getBootstrapOwnerStatus,
  listAccounts,
  getSocialAuthAccountStatus,
  logoutSession,
  refreshToken,
  recordLoginSession,
  registerAccount,
  sendEmailVerificationLink,
  sendPasswordResetLink,
  sendOtp,
  sendSmsOtp,
  verifyOtp,
  verifySmsOtp,
  verifyToken
} from "../../controllers/auth.controller.js";

const router = express.Router();

router.get("/bootstrap-owner-status", getBootstrapOwnerStatus);
router.get("/accounts", listAccounts);
router.post("/authenticate-password", authenticatePassword);
router.post("/register-account", registerAccount);
router.post("/login-session", recordLoginSession);
router.post("/change-password", changePassword);
router.post("/logout-session", logoutSession);
router.delete("/account", deleteAccount);
router.delete("/account/:uid", deleteAccountByUid);
router.post("/refresh-token", refreshToken);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/send-password-reset-link", sendPasswordResetLink);
router.post("/send-email-verification-link", sendEmailVerificationLink);
router.post("/send-sms-otp", sendSmsOtp);
router.post("/verify-sms-otp", verifySmsOtp);
router.post("/verify-token", verifyToken);
router.post("/social-account-status", getSocialAuthAccountStatus);

export default router;
