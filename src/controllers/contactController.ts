import type { Request, Response } from "express";
import { db } from "../db/connection.ts";
import { contactMessages } from "../db/schema.ts";

export const sendContactMessage = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body as {
      name: string;
      email: string;
      subject: string;
      message: string;
    };

    const [created] = await db
      .insert(contactMessages)
      .values({ name, email, subject, message })
      .returning();

    return res.status(201).json({
      id: created.id,
      status: created.status,
      receivedAt: created.createdAt,
      name: created.name,
      email: created.email,
      subject: created.subject,
      message: created.message,
    });
  } catch (e) {
    console.error("Contact error:", e);
    return res.status(500).json({ error: "Failed to send message" });
  }
};
