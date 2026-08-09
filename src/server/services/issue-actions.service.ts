import { prisma } from "../../db";
import { IssueStatus, User } from "../../types";
import { generateId, formatIssueFromDb, issueInclude } from "../lib/utils";
import { AppError } from "../middleware/error.middleware";

export async function voteOnIssue(user: User, issueId: string) {
  const existingIssue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!existingIssue) throw new AppError(404, "Issue not found.");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.upvote.create({ data: { issueId, voterIdentifier: user.id } });
      const newCount = existingIssue.upvotes + 1;
      const verificationRate = Math.min(100, Math.round((newCount / 20) * 100));
      const data: any = { upvotes: { increment: 1 }, verificationRate };
      let promote = false;
      if (newCount >= 5 && existingIssue.status === IssueStatus.OPEN) {
        data.status = IssueStatus.VERIFYING;
        promote = true;
      }
      await tx.issue.update({ where: { id: issueId }, data });
      if (promote) {
        await tx.statusHistory.create({
          data: {
            issueId,
            status: IssueStatus.VERIFYING,
            note: "Community upvote threshold reached. Auto-promoted to Verifying.",
            updatedBy: "System"
          }
        });
      }
      await tx.user.update({
        where: { id: user.id },
        data: { points: { increment: 5 } }
      });
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new AppError(409, "You have already voted on this issue.");
    }
    throw err;
  }

  const updated = await prisma.issue.findUnique({
    where: { id: issueId },
    include: issueInclude
  });
  return formatIssueFromDb(updated);
}

export async function addComment(user: User, issueId: string, text: string) {
  const existingIssue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!existingIssue) throw new AppError(404, "Issue not found.");

  await prisma.comment.create({
    data: {
      id: generateId("comment"),
      issueId,
      authorName: user.name,
      authorRole: user.role,
      text: text.trim()
    }
  });

  const updated = await prisma.issue.findUnique({
    where: { id: issueId },
    include: issueInclude
  });
  return formatIssueFromDb(updated);
}

export async function updateIssueStatus(
  officer: User,
  issueId: string,
  status: IssueStatus,
  note?: string,
  assignedDepartment?: string
) {
  const existingIssue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!existingIssue) throw new AppError(404, "Issue not found.");

  await prisma.$transaction(async (tx) => {
    await tx.issue.update({
      where: { id: issueId },
      data: {
        status,
        ...(assignedDepartment ? { assignedDepartment } : {})
      }
    });
    await tx.statusHistory.create({
      data: {
        issueId,
        status,
        note: note || `Status updated to ${status} by ${officer.name}.`,
        updatedBy: officer.name
      }
    });
  });

  const updated = await prisma.issue.findUnique({
    where: { id: issueId },
    include: issueInclude
  });
  return formatIssueFromDb(updated);
}

