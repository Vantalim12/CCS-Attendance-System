"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = require("../controllers/attendance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const router = (0, express_1.Router)();
// Report generation routes (must come before /:id route)
router.get("/report", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin", "student"), attendance_controller_1.generateReport);
router.get("/export", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), attendance_controller_1.exportToExcel);
router.get("/export/pdf", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), attendance_controller_1.exportToPDF);
router.get("/", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin", "student"), attendance_controller_1.getAttendances);
router.get("/:id", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), attendance_controller_1.getAttendance);
router.post("/", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("student", "admin"), attendance_controller_1.createAttendance); // Mark attendance via QR
router.post("/manual-sign-in", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), attendance_controller_1.manualSignIn); // Manual sign-in (admin only)
router.post("/manual-sign-out", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), attendance_controller_1.manualSignOut); // Manual sign-out (admin only)
router.put("/:id", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), attendance_controller_1.updateAttendance);
router.delete("/:id", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), attendance_controller_1.deleteAttendance);
exports.default = router;
