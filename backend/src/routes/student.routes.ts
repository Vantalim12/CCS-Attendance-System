import { Router } from "express";
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  importStudents,
  exportStudents,
  generateQRCodes,
  downloadQRCodes,
  downloadImportTemplate,
} from "../controllers/student.controller";
import { authenticateJWT } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/rbac.middleware";
import multer from "multer";

const upload = multer({ dest: "uploads/" });
const router = Router();

router.get("/", authenticateJWT, getStudents);
router.get("/:id", authenticateJWT, getStudent);
router.get(
  "/import-template",
  authenticateJWT,
  authorizeRoles("admin"),
  downloadImportTemplate
);
router.post("/", authenticateJWT, authorizeRoles("admin"), createStudent);
router.put("/:id", authenticateJWT, authorizeRoles("admin"), updateStudent);
router.delete("/:id", authenticateJWT, authorizeRoles("admin"), deleteStudent);
router.post(
  "/import",
  authenticateJWT,
  authorizeRoles("admin"),
  upload.single("file"),
  importStudents
);
router.get("/export", authenticateJWT, authorizeRoles("admin"), exportStudents);
router.post(
  "/generate-qr-codes",
  authenticateJWT,
  authorizeRoles("admin"),
  generateQRCodes
);
router.post(
  "/download-qr-codes",
  authenticateJWT,
  authorizeRoles("admin"),
  downloadQRCodes
);

export default router;
