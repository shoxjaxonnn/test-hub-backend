import { Router } from "express";
import { z } from "zod";
import {
  forgotPassword,
  login,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
  verifyResetCode,
} from "../controllers/authController.ts";
import { validateBody } from "../middleware/validation.ts";

const signupSchema = z.object({
  fullname: z.string().trim().min(1, "Full name is required").max(100),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50),
  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const verifyCodeSchema = z.object({
  email: z.email("Invalid email"),
  code: z.string().trim().length(6, "Code must be 6 digits"),
});

const emailOnlySchema = z.object({
  email: z.email("Invalid email"),
});

const resetPasswordSchema = z.object({
  email: z.email("Invalid email"),
  code: z.string().trim().length(6, "Code must be 6 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const router = Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/login", validateBody(loginSchema), login);
router.post("/verify-email", validateBody(verifyCodeSchema), verifyEmail);
router.post(
  "/resend-verification",
  validateBody(emailOnlySchema),
  resendVerification,
);
router.post("/forgot-password", validateBody(emailOnlySchema), forgotPassword);
router.post(
  "/verify-reset-code",
  validateBody(verifyCodeSchema),
  verifyResetCode,
);
router.post("/reset-password", validateBody(resetPasswordSchema), resetPassword);

export default router;
