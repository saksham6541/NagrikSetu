import { z } from "zod";

export const registerSchema = z.object({
  phone: z.string().min(10, "Phone must be at least 10 characters"),
  name: z.string().min(1, "Name is required").max(120),
  city: z.string().max(80).optional(),
  ward: z.string().max(80).optional()
});

export const loginSchema = z.object({
  phone: z.string().min(10, "Phone is required")
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10, "Phone is required"),
  otp: z.union([z.string(), z.number()]).optional()
});

export const loginStaffSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required")
});
