import { Router } from "express";
import {
  getAttendances,
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  manualSignIn,
  manualSignOut,
} from "../controllers/attendance.controller";
import { authenticateJWT } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/rbac.middleware";

const router = Router();

router.get(
  "/",
  authenticateJWT,
  authorizeRoles("admin", "student"),
  getAttendances
);
router.get("/:id", authenticateJWT, authorizeRoles("admin"), getAttendance);
router.post(
  "/",
  authenticateJWT,
  authorizeRoles("student", "admin"),
  createAttendance
); // Mark attendance via QR
router.post(
  "/manual-sign-in",
  authenticateJWT,
  authorizeRoles("admin"),
  manualSignIn
); // Manual sign-in (admin only)
router.post(
  "/manual-sign-out",
  authenticateJWT,
  authorizeRoles("admin"),
  manualSignOut
); // Manual sign-out (admin only)
router.put("/:id", authenticateJWT, authorizeRoles("admin"), updateAttendance);
router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin"),
  deleteAttendance
);

export default router;
