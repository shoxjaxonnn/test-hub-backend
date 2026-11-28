import { Router } from "express";
import {
  getAdminUsers,
  getFlags,
  updateAdminUser,
  updateFlag,
} from "../controllers/adminController.ts";
import { authenticateToken, requireRole } from "../middleware/auth.ts";

const router = Router();

router.use(authenticateToken, requireRole("tes_admin"));

router.get("/flags", getFlags);
router.patch("/flags/:id", updateFlag);
router.get("/users", getAdminUsers);
router.patch("/users/:id", updateAdminUser);

export default router;
