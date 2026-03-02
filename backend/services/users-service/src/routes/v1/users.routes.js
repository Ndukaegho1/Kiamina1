import express from "express";
import {
  getMeAdminDashboard,
  getMeClientDashboard,
  getMeClientDashboardOverview,
  getById,
  getMe,
  patchMeAdminDashboard,
  patchMeClientDashboard,
  patchMeProfile,
  putById,
  removeById,
  syncFromAuth
} from "../../controllers/users.controller.js";

const router = express.Router();

router.post("/sync-from-auth", syncFromAuth);
router.get("/me", getMe);
router.patch("/me/profile", patchMeProfile);
router.get("/me/client-dashboard", getMeClientDashboard);
router.get("/me/client-dashboard/overview", getMeClientDashboardOverview);
router.patch("/me/client-dashboard", patchMeClientDashboard);
router.get("/me/admin-dashboard", getMeAdminDashboard);
router.patch("/me/admin-dashboard", patchMeAdminDashboard);
router.get("/:id", getById);
router.put("/:id", putById);
router.delete("/:id", removeById);

export default router;
