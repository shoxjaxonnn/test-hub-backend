import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const userRoleEnum = pgEnum("user_role", [
  "guest",
  "member",
  "verified_farmer",
  "spac_consultant",
  "tes_author",
  "tes_admin",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatar: varchar("avatar", { length: 500 }),
  role: userRoleEnum("role").default("member").notNull(),
  bio: text("bio"),
  region: jsonb("region").$type<{
    oblast: string;
    raion?: string;
    village?: string;
  }>(),
  languages: jsonb("languages")
    .$type<("ru" | "ky" | "en")[]>()
    .default(["ru"])
    .notNull(),
  interests: jsonb("interests").$type<string[]>().default([]).notNull(),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verificationCodeTypeEnum = pgEnum("verification_code_type", [
  "email_verify",
  "password_reset",
]);

export const verificationCodes = pgTable("verification_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 6 }).notNull(),
  type: verificationCodeTypeEnum("type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  contentLanguages: jsonb("content_languages")
    .$type<("ru" | "ky" | "en")[]>()
    .default(["ru"])
    .notNull(),
  notifications: jsonb("notifications")
    .$type<{
      emailReplies: boolean;
      emailSessions: boolean;
      emailCourses: boolean;
      emailNewsletter: boolean;
    }>()
    .default({
      emailReplies: true,
      emailSessions: true,
      emailCourses: false,
      emailNewsletter: false,
    })
    .notNull(),
  privacy: jsonb("privacy")
    .$type<{
      publicProfile: boolean;
      showRegion: boolean;
      allowMessages: boolean;
    }>()
    .default({
      publicProfile: true,
      showRegion: true,
      allowMessages: true,
    })
    .notNull(),
});

export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 20 }).default("story").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).default("published").notNull(),
  visibility: varchar("visibility", { length: 30 }).default("public").notNull(),
  language: varchar("language", { length: 10 }).default("ru").notNull(),
  topicTags: jsonb("topic_tags").$type<string[]>().default([]).notNull(),
  region: jsonb("region").$type<{ oblast: string; raion?: string; village?: string }>(),
  coverImage: varchar("cover_image", { length: 500 }),
  body: text("body").default("").notNull(),
  excerpt: text("excerpt").default("").notNull(),
  readTimeMinutes: integer("read_time_minutes").default(1).notNull(),
  stats: jsonb("stats")
    .$type<{ views: number; likes: number; comments: number; saves: number }>()
    .default({ views: 0, likes: 0, comments: 0, saves: 0 })
    .notNull(),
  surface: varchar("surface", { length: 30 }).default("community").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 20 }).default("question").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).default("published").notNull(),
  visibility: varchar("visibility", { length: 30 }).default("public").notNull(),
  language: varchar("language", { length: 10 }).default("ru").notNull(),
  topicTags: jsonb("topic_tags").$type<string[]>().default([]).notNull(),
  region: jsonb("region").$type<{ oblast: string; raion?: string; village?: string }>(),
  body: text("body").default("").notNull(),
  answerCount: integer("answer_count").default(0).notNull(),
  isResolved: boolean("is_resolved").default(false).notNull(),
  acceptedAnswerId: varchar("accepted_answer_id", { length: 100 }),
  stats: jsonb("stats")
    .$type<{ views: number; likes: number; comments: number; saves: number }>()
    .default({ views: 0, likes: 0, comments: 0, saves: 0 })
    .notNull(),
  surface: varchar("surface", { length: 30 }).default("community").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 20 }).default("article").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  visibility: varchar("visibility", { length: 30 }).default("private").notNull(),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  topicTags: jsonb("topic_tags").$type<string[]>().default([]).notNull(),
  coverImage: varchar("cover_image", { length: 500 }),
  category: varchar("category", { length: 100 }).notNull(),
  body: text("body").notNull(),
  excerpt: text("excerpt").default("").notNull(),
  readTimeMinutes: integer("read_time_minutes").default(1).notNull(),
  pricing: jsonb("pricing")
    .$type<Record<string, unknown>>()
    .default({
      model: "free",
      currency: "KGS",
      hasDiscount: false,
      isRefundable: false,
    })
    .notNull(),
  stats: jsonb("stats")
    .$type<{ views: number; likes: number; comments: number; saves: number }>()
    .default({ views: 0, likes: 0, comments: 0, saves: 0 })
    .notNull(),
  surface: varchar("surface", { length: 30 }).default("academy").notNull(),
  isVerifiedByTES: boolean("is_verified_by_tes").default(true).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 20 }).default("course").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  visibility: varchar("visibility", { length: 30 }).default("hidden").notNull(),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  topicTags: jsonb("topic_tags").$type<string[]>().default([]).notNull(),
  region: jsonb("region").$type<{ oblast: string; raion?: string; village?: string }>(),
  coverImage: varchar("cover_image", { length: 500 }),
  category: varchar("category", { length: 100 }).default("Crop Production").notNull(),
  shortDescription: text("short_description").default("").notNull(),
  longDescription: text("long_description").default("").notNull(),
  level: varchar("level", { length: 30 }).default("beginner").notNull(),
  estimatedDurationHours: integer("estimated_duration_hours").default(0).notNull(),
  sections: jsonb("sections").$type<Record<string, unknown>[]>().default([]).notNull(),
  enrollmentCount: integer("enrollment_count").default(0).notNull(),
  rating: integer("rating").default(0).notNull(),
  reviewCount: integer("review_count").default(0).notNull(),
  pricing: jsonb("pricing")
    .$type<Record<string, unknown>>()
    .default({
      model: "free",
      currency: "KGS",
      hasDiscount: false,
      isRefundable: false,
    })
    .notNull(),
  certificateTemplate: jsonb("certificate_template").$type<Record<string, unknown>>(),
  completionThresholdPercent: integer("completion_threshold_percent").default(80).notNull(),
  perks: jsonb("perks").$type<string[]>().default([]).notNull(),
  enrollmentLimit: integer("enrollment_limit"),
  stats: jsonb("stats")
    .$type<{ views: number; likes: number; comments: number; saves: number }>()
    .default({ views: 0, likes: 0, comments: 0, saves: 0 })
    .notNull(),
  surface: varchar("surface", { length: 30 }).default("academy").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 20 }).default("session").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  visibility: varchar("visibility", { length: 30 }).default("private").notNull(),
  language: varchar("language", { length: 10 }).default("ru").notNull(),
  topicTags: jsonb("topic_tags").$type<string[]>().default([]).notNull(),
  region: jsonb("region").$type<{ oblast: string; raion?: string; village?: string }>(),
  coverImage: varchar("cover_image", { length: 500 }),
  description: text("description").default("").notNull(),
  format: varchar("format", { length: 30 }).default("online").notNull(),
  sessionType: varchar("session_type", { length: 30 }).default("webinar").notNull(),
  location: varchar("location", { length: 255 }),
  venueAddress: varchar("venue_address", { length: 255 }),
  meetingUrl: varchar("meeting_url", { length: 500 }),
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  endsAt: timestamp("ends_at").defaultNow().notNull(),
  registrationClosesAt: timestamp("registration_closes_at"),
  capacity: integer("capacity").default(0).notNull(),
  registeredCount: integer("registered_count").default(0).notNull(),
  isCanceled: boolean("is_canceled").default(false).notNull(),
  pricing: jsonb("pricing")
    .$type<{
      model: string;
      amount?: number;
      currency: string;
      hasDiscount: boolean;
      isRefundable: boolean;
    }>()
    .default({
      model: "free",
      currency: "KGS",
      hasDiscount: false,
      isRefundable: false,
    })
    .notNull(),
  agenda: jsonb("agenda").$type<Record<string, unknown>[]>().default([]).notNull(),
  materials: jsonb("materials").$type<Record<string, unknown>[]>().default([]).notNull(),
  stats: jsonb("stats")
    .$type<{ views: number; likes: number; comments: number; saves: number }>()
    .default({ views: 0, likes: 0, comments: 0, saves: 0 })
    .notNull(),
  surface: varchar("surface", { length: 30 }).default("sessions").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: varchar("content_id", { length: 255 }).notNull(),
  parentId: varchar("parent_id", { length: 255 }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  likes: integer("likes").default(0).notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionRegistrations = pgTable("session_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  sessionSlug: varchar("session_slug", { length: 255 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 30 }).default("free").notNull(),
  paymentId: varchar("payment_id", { length: 100 }),
  checkInStatus: varchar("check_in_status", { length: 30 }).default("not_checked_in").notNull(),
  attendee: jsonb("attendee")
    .$type<{
      fullName: string;
      email: string;
      phone: string;
      notes?: string;
    }>()
    .notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  progressPercent: integer("progress_percent").default(0).notNull(),
  completedLessonIds: jsonb("completed_lesson_ids").$type<string[]>().default([]).notNull(),
  lastLessonId: varchar("last_lesson_id", { length: 255 }),
  certificateId: uuid("certificate_id"),
  quizState: jsonb("quiz_state")
    .$type<
      Record<
        string,
        {
          bestScorePercent: number;
          passed: boolean;
          attempts: number;
        }
      >
    >()
    .default({})
    .notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const quizzes = pgTable("quizzes", {
  id: varchar("id", { length: 100 }).primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  lessonId: varchar("lesson_id", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  passScorePercent: integer("pass_score_percent").default(70).notNull(),
  maxAttempts: integer("max_attempts"),
  questions: jsonb("questions")
    .$type<
      {
        id: string;
        prompt: string;
        options: { id: string; text: string }[];
        correctOptionIds: string[];
        points: number;
        explanation?: string;
      }[]
    >()
    .default([])
    .notNull(),
});

export const certificates = pgTable("certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  courseSlug: varchar("course_slug", { length: 255 }).notNull(),
  courseTitle: varchar("course_title", { length: 255 }).notNull(),
  recipientName: varchar("recipient_name", { length: 255 }).notNull(),
  verificationCode: varchar("verification_code", { length: 100 }).notNull().unique(),
  scorePercent: integer("score_percent"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").default("").notNull(),
  category: varchar("category", { length: 100 }).default("General").notNull(),
  language: varchar("language", { length: 10 }).default("ru").notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).default("pdf").notNull(),
  fileSize: varchar("file_size", { length: 50 }).default("1 MB").notNull(),
  downloadCount: integer("download_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  link: varchar("link", { length: 500 }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const flags = pgTable("flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: varchar("target_id", { length: 255 }).notNull(),
  reason: text("reason").notNull(),
  reportedBy: uuid("reported_by").references(() => users.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { length: 30 }).default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 30 }).default("received").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
