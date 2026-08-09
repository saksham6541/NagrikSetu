import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  loginStaffSchema
} from "../schemas/auth.schemas";
import * as authService from "../services/auth.service";

const router = Router();

router.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.registerCitizen(req.body);
    res.json(result);
  })
);

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.requestOtp(req.body.phone);
    res.json(result);
  })
);

router.post(
  "/verify-otp",
  validateBody(verifyOtpSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.verifyOtp(req.body.phone, req.body.otp);
    res.json(result);
  })
);

router.post(
  "/login-staff",
  validateBody(loginStaffSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.loginStaff(req.body.email, req.body.password);
    res.json(result);
  })
);

router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: (req as any).user });
});

router.post("/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out. Discard the client token." });
});

export default router;
