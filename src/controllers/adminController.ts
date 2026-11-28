import type { Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { flags, users } from "../db/schema.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";

export const getFlags = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db
      .select()
      .from(flags)
      .orderBy(desc(flags.createdAt));
    return res.status(200).json(list);
  } catch (e) {
    console.error("Get flags error:", e);
    return res.status(500).json({ error: "Failed to get flags" });
  }
};

export const updateFlag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body as { status: string };

    const [updated] = await db
      .update(flags)
      .set({ status })
      .where(eq(flags.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Update flag error:", e);
    return res.status(500).json({ error: "Failed to update flag" });
  }
};

export const getAdminUsers = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const list = await db.select().from(users).orderBy(desc(users.createdAt));
    const publicUsers = list.map((u) => {
      const { password: _, ...rest } = u;
      return rest;
    });
    return res.status(200).json(publicUsers);
  } catch (e) {
    console.error("Get admin users error:", e);
    return res.status(500).json({ error: "Failed to get users" });
  }
};

export const updateAdminUser = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const id = String(req.params.id);
    const { role, isBanned } = req.body;

    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (isBanned !== undefined) updateData.isBanned = isBanned;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }

    const { password: _, ...publicUser } = updated;
    return res.status(200).json(publicUser);
  } catch (e) {
    console.error("Update admin user error:", e);
    return res.status(500).json({ error: "Failed to update user" });
  }
};
