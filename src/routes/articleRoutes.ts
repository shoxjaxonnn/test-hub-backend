import { Router } from "express";
import {
  createArticle,
  getArticleBySlug,
  getArticles,
  updateArticle,
  updateArticleStatus,
} from "../controllers/articleController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const router = Router();

router.get("/", getArticles);
router.get("/:slug", getArticleBySlug);
router.post("/", authenticateToken, createArticle);
router.put("/:slug", authenticateToken, updateArticle);
router.patch("/:slug/status", authenticateToken, updateArticleStatus);

export default router;
