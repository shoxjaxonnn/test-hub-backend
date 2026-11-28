import type { Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { notifications } from "../db/schema.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const unreadOnly = req.query.unread === "true";

    const list = await db
      .select()
      .from(notifications)
      .where(
        unreadOnly
          ? and(
              eq(notifications.userId, userId),
              eq(notifications.isRead, false),
            )
          : eq(notifications.userId, userId),
      )
      .orderBy(desc(notifications.createdAt));

    return res.status(200).json(list);
  } catch (e) {
    console.error("Get notifications error:", e);
    return res.status(500).json({ error: "Failed to get notifications" });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const id = String(req.params.id);
    const isRead = req.body?.isRead ?? true;

    const [updated] = await db
      .update(notifications)
      .set({ isRead })
      .where(
        and(eq(notifications.id, id), eq(notifications.userId, userId)),
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Mark notification read error:", e);
    return res.status(500).json({ error: "Failed to update notification" });
  }
};

export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    return res.status(200).json(list);
  } catch (e) {
    console.error("Mark all read error:", e);
    return res.status(500).json({ error: "Failed to mark all as read" });
  }
};

export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const id = String(req.params.id);

    const [deleted] = await db
      .delete(notifications)
      .where(
        and(eq(notifications.id, id), eq(notifications.userId, userId)),
      )
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(deleted);
  } catch (e) {
    console.error("Delete notification error:", e);
    return res.status(500).json({ error: "Failed to delete notification" });
  }
};
