import express from "express";
import path from "path";
import fs from "fs";
import { UPLOADS_DIR } from "./lib/config";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import issuesRoutes from "./routes/issues.routes";
import assignmentsRoutes from "./routes/assignments.routes";
import aiRoutes from "./routes/ai.routes";
import analyticsRoutes from "./routes/analytics.routes";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "20mb" }));

  const uploadsPath = path.join(process.cwd(), UPLOADS_DIR);
  if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
  app.use("/uploads", express.static(uploadsPath));

  app.use("/api/auth", authRoutes);
  app.use("/api/issues", issuesRoutes);
  app.use("/api", assignmentsRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/analytics", analyticsRoutes);

  return app;
}

export function attachErrorHandlers(app: express.Express) {
  app.use(notFoundHandler);
  app.use(errorHandler);
}
