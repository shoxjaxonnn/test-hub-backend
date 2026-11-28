import { Router } from "express";
import {
  createCourse,
  deleteCourse,
  getCourseBySlug,
  getCourses,
  updateCourse,
  updateCourseStatus,
} from "../controllers/courseController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const router = Router();

router.get("/", getCourses);
router.get("/:slug", getCourseBySlug);
router.post("/", authenticateToken, createCourse);
router.patch("/:slug", authenticateToken, updateCourse);
router.patch("/:slug/status", authenticateToken, updateCourseStatus);
router.delete("/:slug", authenticateToken, deleteCourse);

export default router;
