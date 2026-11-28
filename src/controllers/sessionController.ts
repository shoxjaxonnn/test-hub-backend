import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import {
  notifications,
  sessionRegistrations,
  sessions,
} from "../db/schema.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";

export const getSessions = async (_req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt));
    return res.status(200).json(list);
  } catch (e) {
    console.error("Get sessions error:", e);
    return res.status(500).json({ error: "Failed to get sessions" });
  }
};

export const getSessionBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.slug, slug),
    });

    if (!session) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(session);
  } catch (e) {
    console.error("Get session error:", e);
    return res.status(500).json({ error: "Failed to get session" });
  }
};

export const createSession = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body = req.body;
    if (!body.title || !body.slug) {
      return res
        .status(400)
        .json({ message: "title and slug are required." });
    }

    const existing = await db.query.sessions.findFirst({
      where: eq(sessions.slug, body.slug),
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "A session with this slug already exists." });
    }

    const finalStatus = body.status ?? "draft";
    const [created] = await db
      .insert(sessions)
      .values({
        slug: body.slug,
        title: body.title,
        authorId,
        hostId: body.hostId ?? authorId,
        status: finalStatus,
        visibility: body.visibility ?? "private",
        language: body.language ?? "ru",
        topicTags: body.topicTags ?? [],
        region: body.region ?? null,
        coverImage: body.coverImage ?? null,
        description: body.description ?? "",
        format: body.format ?? "online",
        sessionType: body.sessionType ?? "webinar",
        location: body.location ?? null,
        venueAddress: body.venueAddress ?? null,
        meetingUrl: body.meetingUrl ?? null,
        startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
        endsAt: body.endsAt ? new Date(body.endsAt) : new Date(),
        registrationClosesAt: body.registrationClosesAt
          ? new Date(body.registrationClosesAt)
          : null,
        capacity: body.capacity ?? 0,
        pricing: body.pricing ?? {
          model: "free",
          currency: "KGS",
          hasDiscount: false,
          isRefundable: false,
        },
        agenda: body.agenda ?? [],
        materials: body.materials ?? [],
        publishedAt: finalStatus === "published" ? new Date() : null,
      })
      .returning();

    return res.status(201).json(created);
  } catch (e) {
    console.error("Create session error:", e);
    return res.status(500).json({ error: "Failed to create session" });
  }
};

export const updateSession = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const slug = String(req.params.slug);
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.slug, slug),
    });

    if (!session) {
      return res.status(404).json({ message: "Not found" });
    }

    const body = req.body;
    if (body.slug && body.slug !== session.slug) {
      const taken = await db.query.sessions.findFirst({
        where: eq(sessions.slug, body.slug),
      });
      if (taken) {
        return res
          .status(409)
          .json({ message: "A session with this slug already exists." });
      }
    }

    const { id: _, authorId: __, createdAt: ___, ...allowedFields } = body;
    if (allowedFields.startsAt) {
      allowedFields.startsAt = new Date(allowedFields.startsAt);
    }
    if (allowedFields.endsAt) {
      allowedFields.endsAt = new Date(allowedFields.endsAt);
    }
    if (allowedFields.registrationClosesAt) {
      allowedFields.registrationClosesAt = new Date(
        allowedFields.registrationClosesAt,
      );
    }
    if (body.status === "published" && !session.publishedAt) {
      allowedFields.publishedAt = new Date();
    }

    const [updated] = await db
      .update(sessions)
      .set(allowedFields)
      .where(eq(sessions.id, session.id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Update session error:", e);
    return res.status(500).json({ error: "Failed to update session" });
  }
};

export const updateSessionStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const slug = String(req.params.slug);
    const { status } = req.body as { status: string };

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.slug, slug),
    });

    if (!session) {
      return res.status(404).json({ message: "Not found" });
    }

    const [updated] = await db
      .update(sessions)
      .set({
        status,
        publishedAt:
          status === "published" && !session.publishedAt
            ? new Date()
            : session.publishedAt,
      })
      .where(eq(sessions.id, session.id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Update session status error:", e);
    return res.status(500).json({ error: "Failed to update session status" });
  }
};

export const cancelSession = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const slug = String(req.params.slug);
    const [updated] = await db
      .update(sessions)
      .set({ isCanceled: true })
      .where(eq(sessions.slug, slug))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Cancel session error:", e);
    return res.status(500).json({ error: "Failed to cancel session" });
  }
};

export const restoreSession = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const slug = String(req.params.slug);
    const [updated] = await db
      .update(sessions)
      .set({ isCanceled: false })
      .where(eq(sessions.slug, slug))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Restore session error:", e);
    return res.status(500).json({ error: "Failed to restore session" });
  }
};

export const deleteSession = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const slug = String(req.params.slug);
    const [deleted] = await db
      .delete(sessions)
      .where(eq(sessions.slug, slug))
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(deleted);
  } catch (e) {
    console.error("Delete session error:", e);
    return res.status(500).json({ error: "Failed to delete session" });
  }
};

export const getMyRegistration = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const slug = String(req.params.slug);
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.slug, slug),
    });

    if (!session) {
      return res.status(404).json({ message: "Not found" });
    }

    const registration = await db.query.sessionRegistrations.findFirst({
      where: and(
        eq(sessionRegistrations.userId, userId),
        eq(sessionRegistrations.sessionId, session.id),
      ),
    });

    if (!registration) {
      return res.status(404).json({ message: "Not registered." });
    }

    return res.status(200).json(registration);
  } catch (e) {
    console.error("Get registration error:", e);
    return res.status(500).json({ error: "Failed to get registration" });
  }
};

export const registerForSession = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const slug = String(req.params.slug);
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.slug, slug),
    });

    if (!session) {
      return res.status(404).json({ message: "Not found" });
    }

    const existing = await db.query.sessionRegistrations.findFirst({
      where: and(
        eq(sessionRegistrations.userId, userId),
        eq(sessionRegistrations.sessionId, session.id),
      ),
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "You are already registered for this session." });
    }

    if (session.isCanceled) {
      return res
        .status(400)
        .json({ message: "This session has been canceled." });
    }
    if (session.status !== "published") {
      return res
        .status(400)
        .json({ message: "This session is not open yet." });
    }
    if (session.endsAt.getTime() < Date.now()) {
      return res
        .status(400)
        .json({ message: "This session has already ended." });
    }
    if (
      session.registrationClosesAt &&
      session.registrationClosesAt.getTime() < Date.now()
    ) {
      return res
        .status(400)
        .json({ message: "Registration for this session is closed." });
    }
    if (session.capacity > 0 && session.registeredCount >= session.capacity) {
      return res.status(400).json({ message: "This session is full." });
    }

    const fullName = req.body.fullName?.trim();
    const email = req.body.email?.trim();
    const phone = req.body.phone?.trim();
    const notes = req.body.notes?.trim();

    if (!fullName || !email || !phone) {
      return res
        .status(422)
        .json({ message: "Full name, email and phone are required." });
    }

    const isPaid =
      session.pricing.model !== "free" && Boolean(session.pricing.amount);

    const [created] = await db
      .insert(sessionRegistrations)
      .values({
        userId,
        sessionId: session.id,
        sessionSlug: session.slug,
        paymentStatus: isPaid ? "pending" : "free",
        checkInStatus: "not_checked_in",
        attendee: { fullName, email, phone, notes },
      })
      .returning();

    await db
      .update(sessions)
      .set({ registeredCount: session.registeredCount + 1 })
      .where(eq(sessions.id, session.id));

    await db.insert(notifications).values({
      userId,
      type: "commerce",
      title: isPaid
        ? `Seat held for ${session.title}`
        : `You're registered for ${session.title}`,
      body: isPaid
        ? "Complete the payment to confirm your seat."
        : "We saved your spot. Joining details are on the session page.",
      link: `/sessions/${session.slug}`,
    });

    return res.status(201).json(created);
  } catch (e) {
    console.error("Register session error:", e);
    return res.status(500).json({ error: "Failed to register" });
  }
};

export const checkoutSession = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const slug = String(req.params.slug);
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.slug, slug),
    });

    if (!session) {
      return res.status(404).json({ message: "Not found" });
    }

    const registration = await db.query.sessionRegistrations.findFirst({
      where: and(
        eq(sessionRegistrations.userId, userId),
        eq(sessionRegistrations.sessionId, session.id),
      ),
    });

    if (!registration) {
      return res.status(404).json({ message: "Not registered." });
    }

    if (registration.paymentStatus === "paid") {
      return res.status(200).json(registration);
    }

    if (registration.paymentStatus !== "pending") {
      return res
        .status(400)
        .json({ message: "This registration does not require payment." });
    }

    const [updated] = await db
      .update(sessionRegistrations)
      .set({
        paymentStatus: "paid",
        paymentId: `pay-${randomUUID()}`,
      })
      .where(eq(sessionRegistrations.id, registration.id))
      .returning();

    await db.insert(notifications).values({
      userId,
      type: "commerce",
      title: `Payment confirmed for ${session.title}`,
      body: "Your seat is confirmed. See you there!",
      link: `/sessions/${session.slug}`,
    });

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Checkout session error:", e);
    return res.status(500).json({ error: "Failed to checkout" });
  }
};

export const cancelRegistration = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const slug = String(req.params.slug);
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.slug, slug),
    });

    if (!session) {
      return res.status(404).json({ message: "Not found" });
    }

    const [removed] = await db
      .delete(sessionRegistrations)
      .where(
        and(
          eq(sessionRegistrations.userId, userId),
          eq(sessionRegistrations.sessionId, session.id),
        ),
      )
      .returning();

    if (!removed) {
      return res.status(404).json({ message: "Not registered." });
    }

    await db
      .update(sessions)
      .set({ registeredCount: Math.max(0, session.registeredCount - 1) })
      .where(eq(sessions.id, session.id));

    await db.insert(notifications).values({
      userId,
      type: "commerce",
      title: `Registration canceled for ${session.title}`,
      body: "Your spot has been released.",
      link: `/sessions/${session.slug}`,
    });

    return res.status(200).json(removed);
  } catch (e) {
    console.error("Cancel registration error:", e);
    return res.status(500).json({ error: "Failed to cancel registration" });
  }
};
