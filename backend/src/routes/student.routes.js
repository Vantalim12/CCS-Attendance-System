"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const student_controller_1 = require("../controllers/student.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ dest: "uploads/" });
const router = (0, express_1.Router)();
// Specific routes must come before parameterized routes
router.get("/", auth_middleware_1.authenticateJWT, student_controller_1.getStudents);
router.get("/import-template", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), student_controller_1.downloadImportTemplate);
router.get("/export", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), student_controller_1.exportStudents);
router.post("/generate-qr-codes", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), student_controller_1.generateQRCodes);
router.post("/download-qr-codes", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), student_controller_1.downloadQRCodes);
router.post("/import", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), upload.single("file"), student_controller_1.importStudents);
router.post("/", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), student_controller_1.createStudent);
// Parameterized routes come last
router.get("/:id", auth_middleware_1.authenticateJWT, student_controller_1.getStudent);
router.put("/:id", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), student_controller_1.updateStudent);
router.delete("/:id", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), student_controller_1.deleteStudent);
exports.default = router;
