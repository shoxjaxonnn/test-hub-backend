import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import { isTest } from "../env.ts";
import authRoutes from "./routes/authRoutes.ts";
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

app.use(errorHandler);

export { app };

export default app;
