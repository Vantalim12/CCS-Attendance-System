"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const excuseLetter_controller_1 = require("../controllers/excuseLetter.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.authenticateJWT, excuseLetter_controller_1.getExcuseLetters);
router.get("/:id", auth_middleware_1.authenticateJWT, excuseLetter_controller_1.getExcuseLetter);
router.get("/:id/download", auth_middleware_1.authenticateJWT, excuseLetter_controller_1.downloadExcuseLetter); // Download file
router.post("/", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("student", "admin"), upload_middleware_1.uploadExcuseLetter.single("file"), excuseLetter_controller_1.createExcuseLetter); // Upload
router.put("/:id", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), excuseLetter_controller_1.updateExcuseLetter); // Approve/Reject
router.delete("/:id", auth_middleware_1.authenticateJWT, (0, rbac_middleware_1.authorizeRoles)("admin"), excuseLetter_controller_1.deleteExcuseLetter);
exports.default = router;
