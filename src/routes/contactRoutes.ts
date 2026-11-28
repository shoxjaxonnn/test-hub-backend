import { Router } from "express";
import { z } from "zod";
import { sendContactMessage } from "../controllers/contactController.ts";
import { validateBody } from "../middleware/validation.ts";

const contactSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
  subject: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

const router = Router();

router.post("/", validateBody(contactSchema), sendContactMessage);

export default router;
