import { Router } from "express";
import {
  createComment,
  getComments,
  getQuestionBySlug,
  getQuestions,
  getStories,
  getStoryBySlug,
  likeComment,
  toggleQuestionMetric,
  toggleStoryMetric,
} from "../controllers/communityController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const router = Router();

router.get("/stories", getStories);
router.get("/stories/:slug", getStoryBySlug);
router.post("/stories/:slug/:metric", authenticateToken, toggleStoryMetric);

router.get("/questions", getQuestions);
router.get("/questions/:slug", getQuestionBySlug);
router.post("/questions/:slug/:metric", authenticateToken, toggleQuestionMetric);

router.get("/comments", getComments);
router.post("/comments", authenticateToken, createComment);
router.post("/comments/:id/like", authenticateToken, likeComment);

export default router;
