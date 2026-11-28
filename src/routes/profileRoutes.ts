import { Router } from "express";
import {
  deleteMyProfile,
  getAuthorByUsername,
  getProfileById,
  updateMyProfile,
} from "../controllers/profileController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const router = Router();

router.patch("/profile/me", authenticateToken, updateMyProfile);
router.delete("/profile/me", authenticateToken, deleteMyProfile);
router.get("/profile/:id", getProfileById);
router.get("/authors/:username", getAuthorByUsername);

export default router;
