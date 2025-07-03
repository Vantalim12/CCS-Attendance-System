import { Router } from "express";
import {
  getOfficerExclusions,
  getOfficerExclusion,
  createOfficerExclusion,
  updateOfficerExclusion,
  deleteOfficerExclusion,
  importOfficerExclusions,
  exportOfficerExclusions,
} from "../controllers/officerExclusion.controller";
import { authenticateJWT } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/rbac.middleware";
import multer from "multer";

const upload = multer({ dest: "uploads/" });
const router = Router();

router.get("/", authenticateJWT, authorizeRoles("admin"), getOfficerExclusions);
router.get(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin"),
  getOfficerExclusion
);
router.post(
  "/",
  authenticateJWT,
  authorizeRoles("admin"),
  createOfficerExclusion
);
router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin"),
  updateOfficerExclusion
);
router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin"),
  deleteOfficerExclusion
);
router.post(
  "/import",
  authenticateJWT,
  authorizeRoles("admin"),
  upload.single("file"),
  importOfficerExclusions
);
router.get(
  "/export",
  authenticateJWT,
  authorizeRoles("admin"),
  exportOfficerExclusions
);

export default router;
