import { Router } from "express";
import { asyncHandler } from "../middleware/error.middleware";
import * as analyticsService from "../services/analytics.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await analyticsService.getAnalytics());
  })
);

export default router;
