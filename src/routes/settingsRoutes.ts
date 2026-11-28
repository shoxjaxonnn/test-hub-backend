import { Router } from "express";
import { z } from "zod";
import {
  changePassword,
  getMySettings,
  updateMySettings,
} from "../controllers/settingsController.ts";
import { authenticateToken } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validation.ts";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const router = Router();

router.get("/me", authenticateToken, getMySettings);
router.patch("/me", authenticateToken, updateMySettings);
router.post(
  "/password",
  authenticateToken,
  validateBody(passwordSchema),
  changePassword,
);

export default router;
