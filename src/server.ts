import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import { isTest } from "../env.ts";
import authRoutes from "./routes/authRoutes.ts";
import profileRoutes from "./routes/profileRoutes.ts";
import settingsRoutes from "./routes/settingsRoutes.ts";
import contactRoutes from "./routes/contactRoutes.ts";
import notificationRoutes from "./routes/notificationRoutes.ts";
import adminRoutes from "./routes/adminRoutes.ts";
import communityRoutes from "./routes/communityRoutes.ts";
import articleRoutes from "./routes/articleRoutes.ts";
import courseRoutes from "./routes/courseRoutes.ts";
import sessionRoutes from "./routes/sessionRoutes.ts";
import learningRoutes from "./routes/learningRoutes.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("dev", {
    skip: () => isTest(),
  }),
);

app.get("/health", (req, res) => {
  res.send({ message: "Hey" });
});

app.use("/api/auth", authRoutes);
app.use("/api", profileRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", communityRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api", learningRoutes);

app.use(errorHandler);

export { app };

export default app;
