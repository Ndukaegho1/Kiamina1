import express from "express";
import {
  getAdminClientManagement,
  getAdminClientManagementClient,
  getMeAdminDashboard,
  getMeClientDashboard,
  getMeClientDashboardOverview,
  getMeClientWorkspace,
  getById,
  getMe,
  patchAdminClientManagementClient,
  patchMeAdminDashboard,
  patchMeClientDashboard,
  patchMeClientWorkspace,
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
router.get("/me/client-workspace", getMeClientWorkspace);
router.patch("/me/client-workspace", patchMeClientWorkspace);
router.get("/me/admin-dashboard", getMeAdminDashboard);
router.patch("/me/admin-dashboard", patchMeAdminDashboard);
router.get("/admin/client-management", getAdminClientManagement);
router.get("/admin/client-management/clients/:uid", getAdminClientManagementClient);
router.patch("/admin/client-management/clients/:uid", patchAdminClientManagementClient);
router.get("/:id", getById);
router.put("/:id", putById);
router.delete("/:id", removeById);

export default router;
