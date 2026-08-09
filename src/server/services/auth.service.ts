import bcrypt from "bcryptjs";
import { prisma } from "../../db";
import { UserRole, User } from "../../types";
import { generateId, formatUserFromDb } from "../lib/utils";
import { signJwt } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { logger } from "../lib/logger";

export async function registerCitizen(input: {
  phone: string;
  name: string;
  city?: string;
  ward?: string;
}) {
  const phone = input.phone.replace(/[\s-]/g, "");
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new AppError(409, "Phone number already registered.", {
      user: formatUserFromDb(existing)
    });
  }
  const newUser = await prisma.user.create({
    data: {
      id: generateId("user"),
      phone,
      name: input.name,
      role: UserRole.CITIZEN,
      city: input.city || "Bengaluru",
      ward: input.ward || null,
      points: 50,
      trustScore: 50,
      badges: JSON.stringify(["🎖️ New Citizen"])
    }
  });
  logger.info({ userId: newUser.id }, "Citizen registered");
  return { success: true, user: formatUserFromDb(newUser) };
}

export async function requestOtp(phoneRaw: string) {
  const phone = phoneRaw.replace(/[\s-]/g, "");
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    throw new AppError(404, "Phone number not registered. Please register first.");
  }
  logger.info({ phone }, "[OTP SIMULATION] OTP 123456 dispatched");
  return {
    success: true,
    message: "OTP dispatched to your phone number.",
    userId: user.id
  };
}

export async function verifyOtp(phoneRaw: string, otp: unknown) {
  const phone = phoneRaw.replace(/[\s-]/g, "");
  const otpStr = String(otp ?? "");
  if (otpStr !== "123456") {
    throw new AppError(400, "Invalid OTP. Use 123456 for simulation.");
  }
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new AppError(404, "User not found.");
  const token = signJwt(user.id, user.role as UserRole);
  return { success: true, token, user: formatUserFromDb(user) };
}

export async function loginStaff(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, "Invalid email or password.");
  if (
    user.role !== UserRole.OFFICER &&
    user.role !== UserRole.WORKER &&
    user.role !== UserRole.ADMIN
  ) {
    throw new AppError(403, "Staff login is for Officers and Workers only.");
  }
  if (!user.passwordHash) {
    throw new AppError(401, "No password set for this account. Contact your administrator.");
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, "Invalid email or password.");
  const token = signJwt(user.id, user.role as UserRole);
  return { success: true, token, user: formatUserFromDb(user) };
}

export async function listWorkers() {
  const workers = await prisma.user.findMany({ where: { role: UserRole.WORKER } });
  return workers.map(formatUserFromDb);
}

export async function listUsers() {
  const users = await prisma.user.findMany();
  return users.map((u) => {
    const f = formatUserFromDb(u);
    return {
      id: f.id,
      name: f.name,
      role: f.role,
      city: f.city,
      points: f.points,
      badges: f.badges,
      department: f.department
    };
  });
}
