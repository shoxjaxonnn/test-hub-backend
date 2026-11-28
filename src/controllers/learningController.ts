import { randomBytes, randomUUID } from "crypto";
import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/connection.ts";
import {
  certificates,
  courses,
  enrollments,
  quizzes,
  resources,
  users,
} from "../db/schema.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";

interface LessonItem {
  id: string;
  order: number;
  content?: { kind?: string; quizId?: string };
}

interface SectionItem {
  order: number;
  lessons?: LessonItem[];
}

const getSortedLessons = (sections: Record<string, unknown>[]) => {
  const typed = sections as unknown as SectionItem[];
  return [...typed]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .flatMap((section) =>
      [...(section.lessons ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      ),
    );
};

const makeVerificationCode = (title: string) => {
  const initials = title
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `TES-${initials || "TES"}-${new Date().getFullYear()}-${rand}`;
};

const sameOptions = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

export const getMyEnrollments = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const list = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, userId));

    return res.status(200).json(list);
  } catch (e) {
    console.error("Get enrollments error:", e);
    return res.status(500).json({ error: "Failed to get enrollments" });
  }
};

export const getCourseEnrollment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const slug = String(req.params.slug);
    const course = await db.query.courses.findFirst({
      where: eq(courses.slug, slug),
    });
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, course.id),
      ),
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Not enrolled." });
    }

    return res.status(200).json(enrollment);
  } catch (e) {
    console.error("Get course enrollment error:", e);
    return res.status(500).json({ error: "Failed to get enrollment" });
  }
};

export const enrollInCourse = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const slug = String(req.params.slug);
    const course = await db.query.courses.findFirst({
      where: eq(courses.slug, slug),
    });
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const existing = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, course.id),
      ),
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    if (
      course.enrollmentLimit !== null &&
      course.enrollmentCount >= course.enrollmentLimit
    ) {
      return res.status(409).json({ message: "This course is full." });
    }

    const lessons = getSortedLessons(course.sections);

    const [created] = await db
      .insert(enrollments)
      .values({
        userId,
        courseId: course.id,
        lastLessonId: lessons[0]?.id ?? null,
      })
      .returning();

    await db
      .update(courses)
      .set({ enrollmentCount: course.enrollmentCount + 1 })
      .where(eq(courses.id, course.id));

    return res.status(201).json(created);
  } catch (e) {
    console.error("Enroll error:", e);
    return res.status(500).json({ error: "Failed to enroll" });
  }
};

export const updateCourseProgress = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const slug = String(req.params.slug);
    const { lessonId, completed = true } = req.body as {
      lessonId: string;
      completed?: boolean;
    };

    const course = await db.query.courses.findFirst({
      where: eq(courses.slug, slug),
    });
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, course.id),
      ),
    });
    if (!enrollment) {
      return res.status(404).json({ message: "Not enrolled." });
    }

    const lessons = getSortedLessons(course.sections);
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found." });
    }

    const quizId =
      lesson.content?.kind === "quiz" ? lesson.content.quizId : undefined;
    if (completed && quizId && !enrollment.quizState[quizId]?.passed) {
      return res.status(409).json({
        message: "Pass the quiz before completing this lesson.",
      });
    }

    const doneSet = new Set(enrollment.completedLessonIds);
    if (completed) {
      doneSet.add(lesson.id);
    } else {
      doneSet.delete(lesson.id);
    }

    const completedLessonIds = [...doneSet];
    const doneCount = lessons.filter((l) =>
      completedLessonIds.includes(l.id),
    ).length;
    const progressPercent = lessons.length
      ? Math.round((doneCount / lessons.length) * 100)
      : 0;

    const threshold = course.completionThresholdPercent ?? 100;
    let completedAt = enrollment.completedAt;
    let certificateId = enrollment.certificateId;

    if (progressPercent < threshold) {
      completedAt = null;
    } else {
      if (!completedAt) {
        completedAt = new Date();
      }
      if (course.certificateTemplate && !certificateId) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        const scores = Object.values(enrollment.quizState).map(
          (q) => q.bestScorePercent,
        );
        const avgScore = scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;

        const [cert] = await db
          .insert(certificates)
          .values({
            userId,
            courseId: course.id,
            courseSlug: course.slug,
            courseTitle: course.title,
            recipientName: user?.displayName ?? "TES Learner",
            verificationCode: makeVerificationCode(course.title),
            scorePercent: avgScore,
          })
          .returning();

        certificateId = cert.id;
      }
    }

    const [updated] = await db
      .update(enrollments)
      .set({
        completedLessonIds,
        lastLessonId: lesson.id,
        progressPercent,
        lastAccessedAt: new Date(),
        completedAt,
        certificateId,
      })
      .where(eq(enrollments.id, enrollment.id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Update progress error:", e);
    return res.status(500).json({ error: "Failed to update progress" });
  }
};

export const getQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quizId = String(req.params.quizId);
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    let attemptsUsed = 0;
    if (req.user?.id) {
      const enrollment = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, req.user.id),
          eq(enrollments.courseId, quiz.courseId),
        ),
      });
      attemptsUsed = enrollment?.quizState[quiz.id]?.attempts ?? 0;
    }

    const publicQuestions = quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      points: q.points,
    }));

    return res.status(200).json({
      ...quiz,
      attemptsUsed,
      questions: publicQuestions,
    });
  } catch (e) {
    console.error("Get quiz error:", e);
    return res.status(500).json({ error: "Failed to get quiz" });
  }
};

export const submitQuizAttempt = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const quizId = String(req.params.quizId);
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
    });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, quiz.courseId),
    });
    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, quiz.courseId),
      ),
    });

    if (!course || !enrollment) {
      return res.status(404).json({ message: "Not enrolled." });
    }

    const previous = enrollment.quizState[quiz.id];
    const attemptNumber = (previous?.attempts ?? 0) + 1;

    if (quiz.maxAttempts && attemptNumber > quiz.maxAttempts) {
      return res.status(409).json({ message: "No attempts remaining." });
    }

    const answers = (req.body.answers ?? {}) as Record<string, string[]>;
    const results = quiz.questions.map((q) => {
      const selected = answers[q.id] ?? [];
      return {
        questionId: q.id,
        selectedOptionIds: selected,
        correctOptionIds: q.correctOptionIds,
        isCorrect: sameOptions(selected, q.correctOptionIds),
        explanation: q.explanation,
      };
    });

    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = quiz.questions.reduce(
      (sum, q, idx) => sum + (results[idx].isCorrect ? q.points : 0),
      0,
    );
    const scorePercent = totalPoints
      ? Math.round((earnedPoints / totalPoints) * 100)
      : 0;
    const passed = scorePercent >= quiz.passScorePercent;

    const attempt = {
      id: `attempt-${randomUUID()}`,
      quizId: quiz.id,
      userId,
      attemptNumber,
      submittedAt: new Date().toISOString(),
      earnedPoints,
      totalPoints,
      scorePercent,
      passed,
      results,
    };

    const nextQuizState = {
      ...enrollment.quizState,
      [quiz.id]: {
        bestScorePercent: Math.max(
          previous?.bestScorePercent ?? 0,
          scorePercent,
        ),
        passed: (previous?.passed ?? false) || passed,
        attempts: attemptNumber,
      },
    };

    const doneSet = new Set(enrollment.completedLessonIds);
    let lastLessonId = enrollment.lastLessonId;
    if (passed && quiz.lessonId) {
      doneSet.add(quiz.lessonId);
      lastLessonId = quiz.lessonId;
    }

    const lessons = getSortedLessons(course.sections);
    const completedLessonIds = [...doneSet];
    const doneCount = lessons.filter((l) =>
      completedLessonIds.includes(l.id),
    ).length;
    const progressPercent = lessons.length
      ? Math.round((doneCount / lessons.length) * 100)
      : 0;

    const [updatedEnrollment] = await db
      .update(enrollments)
      .set({
        quizState: nextQuizState,
        completedLessonIds,
        lastLessonId,
        progressPercent,
        lastAccessedAt: new Date(),
      })
      .where(eq(enrollments.id, enrollment.id))
      .returning();

    return res.status(201).json({
      attempt,
      enrollment: updatedEnrollment,
    });
  } catch (e) {
    console.error("Submit quiz attempt error:", e);
    return res.status(500).json({ error: "Failed to submit quiz attempt" });
  }
};

export const getCourseCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const slug = String(req.params.slug);
    const course = await db.query.courses.findFirst({
      where: eq(courses.slug, slug),
    });
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, course.id),
      ),
    });
    if (!enrollment) {
      return res.status(404).json({ message: "Not enrolled." });
    }

    if (!enrollment.certificateId) {
      return res.status(409).json({
        message: "Course not completed yet.",
        progressPercent: enrollment.progressPercent,
        requiredPercent: course.completionThresholdPercent,
      });
    }

    const certificate = await db.query.certificates.findFirst({
      where: eq(certificates.id, enrollment.certificateId),
    });
    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found." });
    }

    return res.status(200).json(certificate);
  } catch (e) {
    console.error("Get certificate error:", e);
    return res.status(500).json({ error: "Failed to get certificate" });
  }
};

export const verifyCertificate = async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code);
    const allCerts = await db.select().from(certificates);
    const found = allCerts.find(
      (c) => c.verificationCode.toLowerCase() === code.toLowerCase(),
    );

    if (!found) {
      return res.status(404).json({ message: "Unknown verification code." });
    }

    return res.status(200).json(found);
  } catch (e) {
    console.error("Verify certificate error:", e);
    return res.status(500).json({ error: "Failed to verify certificate" });
  }
};

export const getResources = async (_req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(resources)
      .orderBy(desc(resources.createdAt));
    return res.status(200).json(list);
  } catch (e) {
    console.error("Get resources error:", e);
    return res.status(500).json({ error: "Failed to get resources" });
  }
};

export const downloadResource = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const resource = await db.query.resources.findFirst({
      where: eq(resources.id, id),
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }

    const [updated] = await db
      .update(resources)
      .set({ downloadCount: resource.downloadCount + 1 })
      .where(eq(resources.id, id))
      .returning();

    return res.status(200).json(updated);
  } catch (e) {
    console.error("Download resource error:", e);
    return res.status(500).json({ error: "Failed to download resource" });
  }
};
