import { Router } from "express";
import {
  cancelRegistration,
  cancelSession,
  checkoutSession,
  createSession,
  deleteSession,
  getMyRegistration,
  getSessionBySlug,
  getSessions,
  registerForSession,
  restoreSession,
  updateSession,
  updateSessionStatus,
} from "../controllers/sessionController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const router = Router();

router.get("/:slug/registration", authenticateToken, getMyRegistration);
router.post("/:slug/register", authenticateToken, registerForSession);
router.post("/:slug/checkout", authenticateToken, checkoutSession);
router.delete("/:slug/register", authenticateToken, cancelRegistration);

router.get("/", getSessions);
router.get("/:slug", getSessionBySlug);
router.post("/", authenticateToken, createSession);
router.patch("/:slug", authenticateToken, updateSession);
router.patch("/:slug/status", authenticateToken, updateSessionStatus);
router.post("/:slug/cancel", authenticateToken, cancelSession);
router.post("/:slug/restore", authenticateToken, restoreSession);
router.delete("/:slug", authenticateToken, deleteSession);

export default router;
