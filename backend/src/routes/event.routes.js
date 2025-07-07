"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_controller_1 = require("../controllers/event.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const router = (0, express_1.Router)();
// Public/protected routes
router.get("/", auth_middleware_1.authenticateJWT, event_controller_1.getEvents);
router.get("/stats", auth_middleware_1.authenticateJWT, event_controller_1.getEventStats);
router.get("/:id", auth_middleware_1.authenticateJWT, event_controller_1.getEvent);
router.get("/:id/attendance", auth_middleware_1.authenticateJWT, event_controller_1.getEventAttendance);
router.get("/:id/attendance/stats", auth_middleware_1.authenticateJWT, event_controller_1.getEventAttendanceStats);
// Admin-only routes
router.post("/", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), event_controller_1.createEvent);
router.put("/:id", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), event_controller_1.updateEvent);
router.delete("/:id", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), event_controller_1.deleteEvent);
exports.default = router;
