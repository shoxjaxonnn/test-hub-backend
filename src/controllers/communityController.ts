import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { comments, questions, stories } from "../db/schema.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";

export const getStories = async (_req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(stories)
      .orderBy(desc(stories.createdAt));
    return res.status(200).json(list);
  } catch (e) {
    console.error("Get stories error:", e);
    return res.status(500).json({ error: "Failed to get stories" });
  }
};

export const getStoryBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const story = await db.query.stories.findFirst({
      where: eq(stories.slug, slug),
    });

    if (!story) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(story);
  } catch (e) {
    console.error("Get story error:", e);
    return res.status(500).json({ error: "Failed to get story" });
  }
};

export const toggleStoryMetric = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const metric = String(req.params.metric);
    const undo = req.query.undo === "true";

    if (metric !== "like" && metric !== "save") {
      return res.status(404).json({ message: "Unknown action" });
    }

    const story = await db.query.stories.findFirst({
      where: eq(stories.slug, slug),
    });

    if (!story) {
      return res.status(404).json({ message: "Not found" });
    }

    const stats = { ...story.stats };
    if (metric === "like") {
      stats.likes = Math.max(0, stats.likes + (undo ? -1 : 1));
    } else {
      stats.saves = Math.max(0, stats.saves + (undo ? -1 : 1));
    }

    const [updated] = await db
      .update(stories)
      .set({ stats })
      .where(eq(stories.id, story.id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Story metric error:", e);
    return res.status(500).json({ error: "Failed to update story" });
  }
};

export const getQuestions = async (_req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(questions)
      .orderBy(desc(questions.createdAt));
    return res.status(200).json(list);
  } catch (e) {
    console.error("Get questions error:", e);
    return res.status(500).json({ error: "Failed to get questions" });
  }
};

export const getQuestionBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const question = await db.query.questions.findFirst({
      where: eq(questions.slug, slug),
    });

    if (!question) {
      return res.status(404).json({ message: "Not found" });
    }

    return res.status(200).json(question);
  } catch (e) {
    console.error("Get question error:", e);
    return res.status(500).json({ error: "Failed to get question" });
  }
};

export const toggleQuestionMetric = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const metric = String(req.params.metric);
    const undo = req.query.undo === "true";

    if (metric !== "like" && metric !== "save") {
      return res.status(404).json({ message: "Unknown action" });
    }

    const question = await db.query.questions.findFirst({
      where: eq(questions.slug, slug),
    });

    if (!question) {
      return res.status(404).json({ message: "Not found" });
    }

    const stats = { ...question.stats };
    if (metric === "like") {
      stats.likes = Math.max(0, stats.likes + (undo ? -1 : 1));
    } else {
      stats.saves = Math.max(0, stats.saves + (undo ? -1 : 1));
    }

    const [updated] = await db
      .update(questions)
      .set({ stats })
      .where(eq(questions.id, question.id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Question metric error:", e);
    return res.status(500).json({ error: "Failed to update question" });
  }
};

export const getComments = async (req: Request, res: Response) => {
  try {
    const contentId = req.query.contentId ? String(req.query.contentId) : "";
    if (!contentId) {
      return res.status(400).json({ message: "contentId is required." });
    }

    const list = await db
      .select()
      .from(comments)
      .where(eq(comments.contentId, contentId))
      .orderBy(desc(comments.createdAt));

    return res.status(200).json(list);
  } catch (e) {
    console.error("Get comments error:", e);
    return res.status(500).json({ error: "Failed to get comments" });
  }
};

export const createComment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { contentId, body, parentId } = req.body as {
      contentId: string;
      body: string;
      parentId?: string;
    };

    if (!contentId || !body?.trim()) {
      return res
        .status(400)
        .json({ message: "contentId and body are required." });
    }

    const [created] = await db
      .insert(comments)
      .values({
        contentId,
        parentId: parentId ?? null,
        authorId,
        body: body.trim(),
      })
      .returning();

    return res.status(201).json(created);
  } catch (e) {
    console.error("Create comment error:", e);
    return res.status(500).json({ error: "Failed to create comment" });
  }
};

export const likeComment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, id),
    });

    if (!comment) {
      return res.status(404).json({ message: "Not found" });
    }

    const [updated] = await db
      .update(comments)
      .set({ likes: comment.likes + 1 })
      .where(eq(comments.id, id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Like comment error:", e);
    return res.status(500).json({ error: "Failed to like comment" });
  }
};
