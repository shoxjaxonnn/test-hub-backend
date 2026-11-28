import { Router } from "express";
import {
  downloadResource,
  enrollInCourse,
  getCourseCertificate,
  getCourseEnrollment,
  getMyEnrollments,
  getQuiz,
  getResources,
  submitQuizAttempt,
  updateCourseProgress,
  verifyCertificate,
} from "../controllers/learningController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const router = Router();

router.get("/enrollments", authenticateToken, getMyEnrollments);
router.get("/courses/:slug/enrollment", authenticateToken, getCourseEnrollment);
router.post("/courses/:slug/enroll", authenticateToken, enrollInCourse);
router.post(
  "/courses/:slug/progress",
  authenticateToken,
  updateCourseProgress,
);
router.get(
  "/courses/:slug/certificate",
  authenticateToken,
  getCourseCertificate,
);

router.get("/quizzes/:quizId", getQuiz);
router.post("/quizzes/:quizId/attempts", authenticateToken, submitQuizAttempt);

router.get("/certificates/verify/:code", verifyCertificate);

router.get("/resources", getResources);
router.post("/resources/:id/download", downloadResource);

export default router;
