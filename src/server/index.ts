import "dotenv/config";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createApp, attachErrorHandlers } from "./app";
import { PORT } from "./lib/config";
import { prisma } from "../db";
import { seedDatabase } from "../../prisma/seed";
import { logger } from "./lib/logger";

async function startServer() {
  const app = createApp();

  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      logger.info("Empty database detected. Running initial seed...");
      await seedDatabase();
    }
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : err },
      "Auto-seed check (DB may be initialising)"
    );
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  attachErrorHandlers(app);

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`NagrikSetu server listening on http://0.0.0.0:${PORT}`);
    logger.info("Demo accounts:");
    logger.info("  Citizen OTP: +919876543210 — OTP: 123456");
    logger.info("  Officer: vignesh.officer@bbmp.gov.in / changeme123");
    logger.info("  Worker:  ramesh.worker@bbmp.gov.in / changeme123");
  });
}

startServer().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
