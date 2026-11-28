import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { articles } from "../db/schema.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";

const slugify = (title: string) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

const calcReadTime = (body: string) => {
  const words = body.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

export const getArticles = async (_req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.createdAt));
    return res.status(200).json(list);
  } catch (e) {
    console.error("Get articles error:", e);
    return res.status(500).json({ error: "Failed to get articles" });
  }
};

export const getArticleBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const article = await db.query.articles.findFirst({
      where: eq(articles.slug, slug),
    });

    if (!article) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(article);
  } catch (e) {
    console.error("Get article error:", e);
    return res.status(500).json({ error: "Failed to get article" });
  }
};

export const createArticle = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, body, category, slug, excerpt, topicTags, coverImage, status, language } =
      req.body;

    if (!title || !body || !category) {
      return res
        .status(400)
        .json({ message: "title, body and category are required." });
    }

    const finalSlug = slug || slugify(title);
    const existing = await db.query.articles.findFirst({
      where: eq(articles.slug, finalSlug),
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "An article with this slug already exists." });
    }

    const finalStatus = status ?? "draft";
    const [created] = await db
      .insert(articles)
      .values({
        slug: finalSlug,
        title,
        body,
        category,
        authorId,
        status: finalStatus,
        visibility: finalStatus === "published" ? "public" : "private",
        language: language ?? "en",
        topicTags: topicTags ?? [],
        coverImage: coverImage ?? null,
        excerpt: excerpt ?? "",
        readTimeMinutes: calcReadTime(body),
        publishedAt: finalStatus === "published" ? new Date() : null,
      })
      .returning();

    return res.status(201).json(created);
  } catch (e) {
    console.error("Create article error:", e);
    return res.status(500).json({ error: "Failed to create article" });
  }
};

export const updateArticle = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const slug = String(req.params.slug);
    const article = await db.query.articles.findFirst({
      where: eq(articles.slug, slug),
    });

    if (!article) {
      return res.status(404).json({ message: "Not found" });
    }

    const { title, body, category, excerpt, topicTags, coverImage, status } =
      req.body;

    const updateData: Record<string, unknown> = {
      title: title ?? article.title,
      body: body ?? article.body,
      category: category ?? article.category,
      readTimeMinutes: body ? calcReadTime(body) : article.readTimeMinutes,
    };

    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (topicTags !== undefined) updateData.topicTags = topicTags;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "published") {
        updateData.visibility = "public";
        if (!article.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }
    }

    const [updated] = await db
      .update(articles)
      .set(updateData)
      .where(eq(articles.id, article.id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Update article error:", e);
    return res.status(500).json({ error: "Failed to update article" });
  }
};

export const updateArticleStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const slug = String(req.params.slug);
    const { status } = req.body as { status: string };

    const article = await db.query.articles.findFirst({
      where: eq(articles.slug, slug),
    });

    if (!article) {
      return res.status(404).json({ message: "Not found" });
    }

    const [updated] = await db
      .update(articles)
      .set({
        status,
        publishedAt:
          status === "published" && !article.publishedAt
            ? new Date()
            : article.publishedAt,
      })
      .where(eq(articles.id, article.id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Update article status error:", e);
    return res.status(500).json({ error: "Failed to update article status" });
  }
};
