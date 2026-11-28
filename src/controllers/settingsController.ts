import type { Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { userSettings, users } from "../db/schema.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import { comparePasswords, hashPassword } from "../utils/password.ts";

export const getMySettings = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (!settings) {
      const [created] = await db
        .insert(userSettings)
        .values({ userId })
        .returning();
      settings = created;
    }

    return res.status(200).json({
      contentLanguages: settings.contentLanguages,
      notifications: settings.notifications,
      privacy: settings.privacy,
    });
  } catch (e) {
    console.error("Get settings error:", e);
    return res.status(500).json({ error: "Failed to get settings" });
  }
};

export const updateMySettings = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let current = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (!current) {
      const [created] = await db
        .insert(userSettings)
        .values({ userId })
        .returning();
      current = created;
    }

    const { contentLanguages, notifications, privacy } = req.body;

    const [updated] = await db
      .update(userSettings)
      .set({
        contentLanguages: contentLanguages ?? current.contentLanguages,
        notifications: notifications
          ? { ...current.notifications, ...notifications }
          : current.notifications,
        privacy: privacy
          ? { ...current.privacy, ...privacy }
          : current.privacy,
      })
      .where(eq(userSettings.userId, userId))
      .returning();

    return res.status(200).json({
      contentLanguages: updated.contentLanguages,
      notifications: updated.notifications,
      privacy: updated.privacy,
    });
  } catch (e) {
    console.error("Update settings error:", e);
    return res.status(500).json({ error: "Failed to update settings" });
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "The new password must differ from the current one.",
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValid = await comparePasswords(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    return res.status(204).send();
  } catch (e) {
    console.error("Change password error:", e);
    return res.status(500).json({ error: "Failed to change password" });
  }
};
