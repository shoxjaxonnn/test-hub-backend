import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
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
  password: varchar("password", {
    length: 255,
  }).notNull(),

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
