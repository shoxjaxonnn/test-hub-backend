import type { Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { users } from "../db/schema.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";

export const updateMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { username, displayName, bio, avatar, interests, region, languages } =
      req.body;

    const updateData: Record<string, unknown> = {};
    if (username !== undefined) updateData.username = username;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (interests !== undefined) updateData.interests = interests;
    if (region !== undefined) updateData.region = region;
    if (languages !== undefined) updateData.languages = languages;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password: _, ...publicUser } = updated;
    return res.status(200).json(publicUser);
  } catch (e) {
    console.error("Update profile error:", e);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

export const deleteMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await db.delete(users).where(eq(users.id, userId));
    return res.status(204).send();
  } catch (e) {
    console.error("Delete profile error:", e);
    return res.status(500).json({ error: "Failed to delete profile" });
  }
};

export const getProfileById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = String(req.params.id);
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return res.status(404).json({ message: "Not found" });
    }

    const { password: _, ...publicUser } = user;
    return res.status(200).json(publicUser);
  } catch (e) {
    console.error("Get profile error:", e);
    return res.status(500).json({ error: "Failed to get profile" });
  }
};

export const getAuthorByUsername = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const username = String(req.params.username);
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      return res.status(404).json({ message: "Not found" });
    }

    const { password: _, ...publicUser } = user;
    return res.status(200).json(publicUser);
  } catch (e) {
    console.error("Get author error:", e);
    return res.status(500).json({ error: "Failed to get author" });
  }
};
