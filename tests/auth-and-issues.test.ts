import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp, attachErrorHandlers } from "../src/server/app";
import { prisma } from "../src/db";
import { seedDatabase } from "../prisma/seed";
import { runLocalRuleAnalysis } from "../src/server/services/ai.service";

const app = createApp();
attachErrorHandlers(app);

beforeAll(async () => {
  // Ensure demo data exists
  const count = await prisma.user.count();
  if (count === 0) await seedDatabase();
});

describe("auth middleware", () => {
  it("rejects unauthenticated issue create with 401", async () => {
    const res = await request(app)
      .post("/api/issues")
      .send({
        title: "x",
        description: "enough text",
        location: { lat: 1, lng: 2, address: "a", city: "b" }
      });
    expect(res.status).toBe(401);
  });

  it("rejects officer route for citizen token with 403", async () => {
    const otp = await request(app)
      .post("/api/auth/verify-otp")
      .send({ phone: "+919876543210", otp: "123456" });
    expect(otp.status).toBe(200);
    const token = otp.body.token;
    const issues = await request(app).get("/api/issues");
    const id = issues.body[0]?.id || issues.body.issues?.[0]?.id;
    const res = await request(app)
      .post(`/api/issues/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ASSIGNED" });
    expect(res.status).toBe(403);
  });
});

describe("validation", () => {
  it("returns 400 for malformed register body", async () => {
    const res = await request(app).post("/api/auth/register").send({ phone: "1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Validation/i);
  });

  it("returns 400 for malformed create issue body", async () => {
    const otp = await request(app)
      .post("/api/auth/verify-otp")
      .send({ phone: "+919876543210", otp: "123456" });
    const res = await request(app)
      .post("/api/issues")
      .set("Authorization", `Bearer ${otp.body.token}`)
      .send({ title: "ab" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid status value", async () => {
    const staff = await request(app)
      .post("/api/auth/login-staff")
      .send({ email: "vignesh.officer@bbmp.gov.in", password: "changeme123" });
    const issues = await request(app).get("/api/issues");
    const id = issues.body[0]?.id || issues.body.issues?.[0]?.id;
    const res = await request(app)
      .post(`/api/issues/${id}/status`)
      .set("Authorization", `Bearer ${staff.body.token}`)
      .send({ status: "NOT_A_STATUS" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for evidence without imageBase64", async () => {
    const otp = await request(app)
      .post("/api/auth/verify-otp")
      .send({ phone: "+919876543210", otp: "123456" });
    const issues = await request(app).get("/api/issues");
    const id = issues.body[0]?.id || issues.body.issues?.[0]?.id;
    const res = await request(app)
      .post(`/api/issues/${id}/evidence`)
      .set("Authorization", `Bearer ${otp.body.token}`)
      .send({ stage: "BEFORE" });
    expect(res.status).toBe(400);
  });
});

describe("vote dedup", () => {
  it("rejects second vote from same user", async () => {
    const otp = await request(app)
      .post("/api/auth/verify-otp")
      .send({ phone: "+919876543210", otp: "123456" });
    const token = otp.body.token;

    // create a fresh issue
    const created = await request(app)
      .post("/api/issues")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Vote dedup test hole",
        description: "Long enough description for validation rules",
        location: { lat: 12.9, lng: 77.6, address: "Test St", city: "Bengaluru" }
      });
    expect(created.status).toBe(200);
    const id = created.body.id;

    // reporter already auto-voted; second vote should 409
    const second = await request(app)
      .post(`/api/issues/${id}/vote`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(second.status).toBe(409);
  });
});

describe("AI fallback", () => {
  it("runLocalRuleAnalysis detects pothole", () => {
    const r = runLocalRuleAnalysis("Big pothole", "Dangerous pothole on road");
    expect(r.detectedCategory).toBe("POTHOLE");
    expect(r.priorityScore).toBeGreaterThan(0);
  });
});
