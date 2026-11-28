import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { courses } from "../db/schema.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";

const slugify = (title: string) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

export const getCourses = async (_req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(courses)
      .orderBy(desc(courses.createdAt));
    return res.status(200).json(list);
  } catch (e) {
    console.error("Get courses error:", e);
    return res.status(500).json({ error: "Failed to get courses" });
  }
};

export const getCourseBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const course = await db.query.courses.findFirst({
      where: eq(courses.slug, slug),
    });

    if (!course) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(course);
  } catch (e) {
    console.error("Get course error:", e);
    return res.status(500).json({ error: "Failed to get course" });
  }
};

export const createCourse = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body = req.body;
    if (!body.title) {
      return res.status(400).json({ message: "title is required." });
    }

    const finalSlug = body.slug || slugify(body.title);
    const existing = await db.query.courses.findFirst({
      where: eq(courses.slug, finalSlug),
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "A course with this slug already exists." });
    }

    const finalStatus = body.status ?? "draft";
    const [created] = await db
      .insert(courses)
      .values({
        slug: finalSlug,
        title: body.title,
        authorId,
        status: finalStatus,
        visibility: body.visibility ?? "hidden",
        language: body.language ?? "en",
        topicTags: body.topicTags ?? [],
        region: body.region ?? null,
        coverImage: body.coverImage ?? null,
        category: body.category ?? "Crop Production",
        shortDescription: body.shortDescription ?? "",
        longDescription: body.longDescription ?? "",
        level: body.level ?? "beginner",
        estimatedDurationHours: body.estimatedDurationHours ?? 0,
        sections: body.sections ?? [],
        pricing: body.pricing ?? {
          model: "free",
          currency: "KGS",
          hasDiscount: false,
          isRefundable: false,
        },
        certificateTemplate: body.certificateTemplate ?? null,
        completionThresholdPercent: body.completionThresholdPercent ?? 80,
        perks: body.perks ?? [],
        enrollmentLimit: body.enrollmentLimit ?? null,
        publishedAt: finalStatus === "published" ? new Date() : null,
      })
      .returning();

    return res.status(201).json(created);
  } catch (e) {
    console.error("Create course error:", e);
    return res.status(500).json({ error: "Failed to create course" });
  }
};

export const updateCourse = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const slug = String(req.params.slug);
    const course = await db.query.courses.findFirst({
      where: eq(courses.slug, slug),
    });

    if (!course) {
      return res.status(404).json({ message: "Not found" });
    }

    const body = req.body;
    if (body.slug && body.slug !== course.slug) {
      const taken = await db.query.courses.findFirst({
        where: eq(courses.slug, body.slug),
      });
      if (taken) {
        return res
          .status(409)
          .json({ message: "A course with this slug already exists." });
      }
    }

    const { id: _, authorId: __, createdAt: ___, ...allowedFields } = body;
    if (body.status === "published" && !course.publishedAt) {
      allowedFields.publishedAt = new Date();
    }

    const [updated] = await db
      .update(courses)
      .set(allowedFields)
      .where(eq(courses.id, course.id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Update course error:", e);
    return res.status(500).json({ error: "Failed to update course" });
  }
};

export const updateCourseStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const slug = String(req.params.slug);
    const { status } = req.body as { status: string };

    const course = await db.query.courses.findFirst({
      where: eq(courses.slug, slug),
    });

    if (!course) {
      return res.status(404).json({ message: "Not found" });
    }

    const [updated] = await db
      .update(courses)
      .set({
        status,
        publishedAt:
          status === "published" && !course.publishedAt
            ? new Date()
            : course.publishedAt,
      })
      .where(eq(courses.id, course.id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Update course status error:", e);
    return res.status(500).json({ error: "Failed to update course status" });
  }
};

export const deleteCourse = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const slug = String(req.params.slug);
    const [deleted] = await db
      .delete(courses)
      .where(eq(courses.slug, slug))
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(deleted);
  } catch (e) {
    console.error("Delete course error:", e);
    return res.status(500).json({ error: "Failed to delete course" });
  }
};
