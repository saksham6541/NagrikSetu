import { Router } from "express";
import { optionalAuth } from "../middleware/auth.middleware";
import { aiAnalyzeLimiter } from "../middleware/rateLimit.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { analyzeDraftSchema } from "../schemas/ai.schemas";
import * as aiService from "../services/ai.service";

const router = Router();

router.post(
  "/analyze-draft",
  optionalAuth,
  aiAnalyzeLimiter,
  validateBody(analyzeDraftSchema),
  asyncHandler(async (req, res) => {
    const result = await aiService.analyzeDraft(req.body);
    res.json(result);
  })
);

export default router;
