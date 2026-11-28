import { Router } from "express";
import {
  deleteNotification,
  getNotifications,
  markAllAsRead,
  markAsRead,
} from "../controllers/notificationController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const router = Router();

router.get("/", authenticateToken, getNotifications);
router.patch("/:id/read", authenticateToken, markAsRead);
router.post("/read-all", authenticateToken, markAllAsRead);
router.delete("/:id", authenticateToken, deleteNotification);

export default router;
