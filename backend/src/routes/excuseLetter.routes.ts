import { Router } from "express";
import {
  getExcuseLetters,
  getExcuseLetter,
  createExcuseLetter,
  updateExcuseLetter,
  deleteExcuseLetter,
  downloadExcuseLetter,
} from "../controllers/excuseLetter.controller";
import { authenticateJWT } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/rbac.middleware";
import { uploadExcuseLetter } from "../middleware/upload.middleware";

const router = Router();

router.get("/", authenticateJWT, getExcuseLetters);
router.get("/:id", authenticateJWT, getExcuseLetter);
router.get("/:id/download", authenticateJWT, downloadExcuseLetter); // Download file
router.post(
  "/",
  authenticateJWT,
  authorizeRoles("student", "admin"),
  uploadExcuseLetter.single("file"),
  createExcuseLetter
); // Upload
router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin"),
  updateExcuseLetter
); // Approve/Reject
router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin"),
  deleteExcuseLetter
);

export default router;
