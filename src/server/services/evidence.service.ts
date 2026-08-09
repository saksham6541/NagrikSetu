import fs from "fs";
import path from "path";
import { prisma } from "../../db";
import { User } from "../../types";
import { generateId } from "../lib/utils";
import { AppError } from "../middleware/error.middleware";
import { UPLOADS_DIR } from "../lib/config";
import { logger } from "../lib/logger";

export async function uploadEvidence(
  user: User,
  issueId: string,
  imageBase64: string,
  stage: string,
  caption?: string
) {
  const existingIssue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!existingIssue) throw new AppError(404, "Issue not found.");

  const uploadsPath = path.join(process.cwd(), UPLOADS_DIR);
  if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

  let fileUrl: string;
  try {
    const data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;
    const ext = "jpg";
    const fileName = `${generateId("ev")}.${ext}`;
    const filePath = path.join(uploadsPath, fileName);
    fs.writeFileSync(filePath, Buffer.from(data, "base64"));
    fileUrl = `/uploads/${fileName}`;
  } catch (err) {
    logger.error({ err }, "Failed to save evidence file");
    throw new AppError(500, "Failed to save evidence file.");
  }

  const newEvidence = await prisma.evidenceUpload.create({
    data: {
      id: generateId("evidence"),
      issueId,
      uploadedBy: user.id,
      uploadedByName: user.name,
      uploadedByRole: user.role,
      fileUrl,
      fileType: "image",
      caption: caption || null,
      stage
    }
  });

  return {
    id: newEvidence.id,
    issueId: newEvidence.issueId,
    uploadedBy: newEvidence.uploadedBy,
    uploadedByName: newEvidence.uploadedByName,
    uploadedByRole: newEvidence.uploadedByRole,
    fileUrl: newEvidence.fileUrl,
    fileType: newEvidence.fileType,
    caption: newEvidence.caption || undefined,
    uploadedAt: newEvidence.uploadedAt.toISOString(),
    stage: newEvidence.stage
  };
}

export async function listEvidence(issueId: string) {
  const evidence = await prisma.evidenceUpload.findMany({
    where: { issueId },
    orderBy: { uploadedAt: "asc" }
  });
  return evidence.map((e) => ({
    id: e.id,
    issueId: e.issueId,
    uploadedBy: e.uploadedBy,
    uploadedByName: e.uploadedByName,
    uploadedByRole: e.uploadedByRole,
    fileUrl: e.fileUrl,
    fileType: e.fileType,
    caption: e.caption || undefined,
    uploadedAt: e.uploadedAt.toISOString(),
    stage: e.stage
  }));
}
