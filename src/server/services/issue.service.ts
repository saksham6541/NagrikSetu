import fs from "fs";
import path from "path";
import { prisma } from "../../db";
import {
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  User,
  AssignmentStatus
} from "../../types";
import {
  generateId,
  getSlaHours,
  formatIssueFromDb,
  issueInclude
} from "../lib/utils";
import { AppError } from "../middleware/error.middleware";
import { UPLOADS_DIR } from "../lib/config";
import { logger } from "../lib/logger";

export async function listIssues(page = 1, limit = 20) {
  const take = Math.min(Math.max(limit, 1), 100);
  const skip = (Math.max(page, 1) - 1) * take;
  const [rows, total] = await Promise.all([
    prisma.issue.findMany({
      include: issueInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take
    }),
    prisma.issue.count()
  ]);
  return {
    issues: rows.map(formatIssueFromDb),
    page: Math.max(page, 1),
    limit: take,
    total,
    totalPages: Math.ceil(total / take)
  };
}

export async function getIssueById(id: string) {
  const dbIssue = await prisma.issue.findUnique({
    where: { id },
    include: issueInclude
  });
  if (!dbIssue) throw new AppError(404, "Issue not found.");
  return formatIssueFromDb(dbIssue);
}

export async function createIssue(
  user: User,
  body: {
    title: string;
    description: string;
    category?: string;
    severity?: string;
    location: { lat: number; lng: number; address: string; city: string; ward?: string };
    imageUrl?: string;
    voiceUrl?: string | null;
    aiAnalysis?: any;
  }
) {
  const { title, description, category, severity, location, imageUrl, aiAnalysis, voiceUrl } = body;
  const createdTime = new Date();
  const hours = getSlaHours((severity as IssueSeverity) || IssueSeverity.MEDIUM);
  const slaDeadline = new Date(createdTime.getTime() + hours * 60 * 60 * 1000);
  const issueId = generateId("issue");

  const createdIssue = await prisma.$transaction(async (tx) => {
    const issue = await tx.issue.create({
      data: {
        id: issueId,
        title,
        description,
        category: category || IssueCategory.OTHER,
        severity: severity || IssueSeverity.MEDIUM,
        status: IssueStatus.OPEN,
        lat: location.lat || 0,
        lng: location.lng || 0,
        address: location.address || "",
        city: location.city || "",
        ward: location.ward || "",
        imageUrl:
          imageUrl ||
          "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80",
        reporterName: user.name,
        reporterPhone: user.phone || "",
        reporterId: user.id,
        upvotes: 1,
        verificationRate: 5,
        assignedDepartment: aiAnalysis?.departmentRouting || "General Ward Grievance Cell",
        slaDeadline,
        isEscalated: false,
        voiceUrl: voiceUrl || null,
        createdAt: createdTime
      }
    });

    await tx.statusHistory.create({
      data: {
        issueId: issue.id,
        status: IssueStatus.OPEN,
        note: `Issue reported by citizen ${user.name}.`,
        updatedBy: user.name,
        updatedAt: createdTime
      }
    });

    await tx.upvote.create({
      data: { issueId: issue.id, voterIdentifier: user.id }
    });

    await tx.user.update({
      where: { id: user.id },
      data: { points: { increment: 10 } }
    });

    if (aiAnalysis) {
      await tx.aIAnalysisResult.create({
        data: {
          issueId: issue.id,
          detectedCategory: aiAnalysis.detectedCategory || category || IssueCategory.OTHER,
          detectedSeverity: aiAnalysis.detectedSeverity || severity || IssueSeverity.MEDIUM,
          confidenceScore: aiAnalysis.confidenceScore || 0,
          duplicateFound: !!aiAnalysis.duplicateFound,
          duplicateIssueId: aiAnalysis.duplicateIssueId || null,
          priorityScore: aiAnalysis.priorityScore || 50,
          departmentRouting: aiAnalysis.departmentRouting || "General Ward Grievance Cell",
          summaryDraftEn: aiAnalysis.summaryDraftEn || "",
          summaryDraftHi: aiAnalysis.summaryDraftHi || ""
        }
      });
    }

    return tx.issue.findUnique({ where: { id: issue.id }, include: issueInclude });
  });

  logger.info({ issueId, userId: user.id }, "Issue created");
  return formatIssueFromDb(createdIssue);
}

