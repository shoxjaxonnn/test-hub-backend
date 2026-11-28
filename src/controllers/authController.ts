import { randomInt } from "crypto";
import type { Request, Response } from "express";
import { and, eq, gt, or } from "drizzle-orm";
import { db } from "../db/connection.ts";
import { users, verificationCodes, type User } from "../db/schema.ts";
import { generateToken } from "../utils/jwt.ts";
import { comparePasswords, hashPassword } from "../utils/password.ts";
import { isDev } from "../../env.ts";

const CODE_TTL_MS = 15 * 60 * 1000;

const toPublicUser = (user: User) => {
  const { password: _, ...publicUser } = user;
  return publicUser;
};

const issueVerificationCode = async (
  userId: string,
  email: string,
  type: "email_verify" | "password_reset",
) => {
  await db
    .delete(verificationCodes)
    .where(
      and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.type, type),
      ),
    );

  const code = randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await db.insert(verificationCodes).values({
    userId,
    code,
    type,
    expiresAt,
  });

  if (isDev()) {
    console.log(`[AUTH ${type}] ${email} -> code: ${code}`);
  }

  return code;
};

const findValidCode = async (
  userId: string,
  code: string,
  type: "email_verify" | "password_reset",
) => {
  return db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.userId, userId),
      eq(verificationCodes.code, code),
      eq(verificationCodes.type, type),
      gt(verificationCodes.expiresAt, new Date()),
    ),
  });
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { fullname, username, email, password } = req.body as {
      fullname: string;
      username: string;
      email: string;
      password: string;
    };

    const existing = await db.query.users.findFirst({
      where: or(eq(users.email, email), eq(users.username, username)),
    });

    if (existing) {
      const field = existing.email === email ? "Email" : "Username";
      return res.status(409).json({ error: `${field} is already taken` });
    }

    const hashedPassword = await hashPassword(password);

    const [created] = await db
      .insert(users)
      .values({
        email,
        username,
        displayName: fullname,
        password: hashedPassword,
      })
      .returning();

    await issueVerificationCode(created.id, created.email, "email_verify");

    return res.status(201).json({
      message: "User created. Please verify your email.",
    });
  } catch (e) {
    console.error("Signup error:", e);
    return res.status(500).json({ error: "Failed to create user" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValidPassword = await comparePasswords(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "Account is suspended" });
    }

    if (!user.isEmailVerified) {
      return res
        .status(403)
        .json({ error: "Please verify your email before logging in" });
    }

    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    return res.status(200).json({
      token,
      user: toPublicUser(user),
    });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ error: "Failed to login" });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email: string; code: string };

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const record = await findValidCode(user.id, code, "email_verify");
    if (!record) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.id, user.id))
      .returning();

    await db
      .delete(verificationCodes)
      .where(eq(verificationCodes.id, record.id));

    const token = await generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role,
    });

    return res.status(200).json({
      token,
      user: toPublicUser(updatedUser),
    });
  } catch (e) {
    console.error("Verify email error:", e);
    return res.status(500).json({ error: "Failed to verify email" });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (user && !user.isEmailVerified) {
      await issueVerificationCode(user.id, user.email, "email_verify");
    }

    return res.status(200).json({
      message: "If the account exists, a verification code has been sent.",
    });
  } catch (e) {
    console.error("Resend verification error:", e);
    return res.status(500).json({ error: "Failed to resend verification" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (user) {
      await issueVerificationCode(user.id, user.email, "password_reset");
    }

    return res.status(200).json({
      message: "If the email exists, a reset code has been sent.",
    });
  } catch (e) {
    console.error("Forgot password error:", e);
    return res.status(500).json({ error: "Failed to process request" });
  }
};

export const verifyResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email: string; code: string };

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const record = await findValidCode(user.id, code, "password_reset");
    if (!record) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    return res.status(200).json({ message: "Code verified" });
  } catch (e) {
    console.error("Verify reset code error:", e);
    return res.status(500).json({ error: "Failed to verify reset code" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, password } = req.body as {
      email: string;
      code: string;
      password: string;
    };

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(400).json({ error: "Reset code is invalid or expired" });
    }

    const record = await findValidCode(user.id, code, "password_reset");
    if (!record) {
      return res.status(400).json({ error: "Reset code is invalid or expired" });
    }

    const hashedPassword = await hashPassword(password);

    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id));

    await db
      .delete(verificationCodes)
      .where(eq(verificationCodes.id, record.id));

    return res.status(200).json({ message: "Password reset successful" });
  } catch (e) {
    console.error("Reset password error:", e);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};
