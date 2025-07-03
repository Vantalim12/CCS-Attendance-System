import { Router } from "express";
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStats,
  getEventAttendance,
  getEventAttendanceStats,
} from "../controllers/event.controller";
import { authenticateJWT } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/rbac.middleware";

const router = Router();

// Public/protected routes
router.get("/", authenticateJWT, getEvents);
router.get("/stats", authenticateJWT, getEventStats);
router.get("/:id", authenticateJWT, getEvent);
router.get("/:id/attendance", authenticateJWT, getEventAttendance);
router.get("/:id/attendance/stats", authenticateJWT, getEventAttendanceStats);

// Admin-only routes
router.post("/", authenticateJWT, authorizeRoles("admin"), createEvent);
router.put("/:id", authenticateJWT, authorizeRoles("admin"), updateEvent);
router.delete("/:id", authenticateJWT, authorizeRoles("admin"), deleteEvent);

export default router;
