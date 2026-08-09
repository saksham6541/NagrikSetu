import { prisma } from "../../db";
import { IssueStatus, User, AssignmentStatus } from "../../types";
import { generateId, formatIssueFromDb, issueInclude } from "../lib/utils";
import { AppError } from "../middleware/error.middleware";

export async function assignWorker(
  officer: User,
  issueId: string,
  workerId: string,
  notes?: string
) {
  const worker = await prisma.user.findFirst({
    where: { id: workerId, role: "WORKER" }
  });
  if (!worker) throw new AppError(404, "Worker not found.");

  const existingIssue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!existingIssue) throw new AppError(404, "Issue not found.");

  const assignmentId = generateId("assign");
  const { updatedIssue, newAssignment } = await prisma.$transaction(async (tx) => {
    await tx.issue.update({
      where: { id: issueId },
      data: {
        assignedWorkerId: workerId,
        assignedWorkerName: worker.name,
        status: IssueStatus.ASSIGNED
      }
    });
    await tx.statusHistory.create({
      data: {
        issueId,
        status: IssueStatus.ASSIGNED,
        note: `Assigned to field worker ${worker.name} by ${officer.name}.`,
        updatedBy: officer.name
      }
    });
    const assignment = await tx.workerAssignment.create({
      data: {
        id: assignmentId,
        issueId,
        workerId,
        workerName: worker.name,
        assignedBy: officer.id,
        assignedByName: officer.name,
        status: "PENDING",
        notes: notes || null
      }
    });
    const issue = await tx.issue.findUnique({
      where: { id: issueId },
      include: issueInclude
    });
    return { updatedIssue: formatIssueFromDb(issue), newAssignment: assignment };
  });

  return { issue: updatedIssue, assignment: newAssignment };
}

export async function listWorkerAssignments(worker: User) {
  const assignments = await prisma.workerAssignment.findMany({
    where: { workerId: worker.id },
    include: { issue: { include: issueInclude } },
    orderBy: { assignedAt: "desc" }
  });
  return assignments.map((a) => ({
    id: a.id,
    issueId: a.issueId,
    workerId: a.workerId,
    workerName: a.workerName,
    assignedBy: a.assignedBy,
    assignedByName: a.assignedByName,
    assignedAt: a.assignedAt.toISOString(),
    status: a.status as AssignmentStatus,
    notes: a.notes || undefined,
    completedAt: a.completedAt ? a.completedAt.toISOString() : undefined,
    issue: a.issue ? formatIssueFromDb(a.issue) : null
  }));
}

export async function updateAssignment(
  worker: User,
  assignmentId: string,
  status: string,
  notes?: string
) {
  const assignment = await prisma.workerAssignment.findFirst({
    where: { id: assignmentId, workerId: worker.id }
  });
  if (!assignment) {
    throw new AppError(404, "Assignment not found or not assigned to you.");
  }

  const validTransitions: Record<string, string[]> = {
    PENDING: ["ACCEPTED"],
    ACCEPTED: ["IN_PROGRESS"],
    IN_PROGRESS: ["COMPLETED"]
  };
  if (!validTransitions[assignment.status]?.includes(status)) {
    throw new AppError(
      400,
      `Invalid status transition from ${assignment.status} to ${status}.`
    );
  }

  const updatedAssignment = await prisma.$transaction(async (tx) => {
    const updated = await tx.workerAssignment.update({
      where: { id: assignment.id },
      data: {
        status,
        notes: notes || undefined,
        completedAt: status === "COMPLETED" ? new Date() : undefined
      }
    });

    let newIssueStatus: IssueStatus | null = null;
    let historyNote = "";
    if (status === "ACCEPTED") {
      historyNote = `Worker ${worker.name} accepted the assignment.`;
    } else if (status === "IN_PROGRESS") {
      newIssueStatus = IssueStatus.IN_PROGRESS;
      historyNote = `Worker ${worker.name} started on-site work.`;
    } else if (status === "COMPLETED") {
      newIssueStatus = IssueStatus.RESOLVED;
      historyNote = `Worker ${worker.name} completed the repair. Issue marked as resolved.`;
    }

    if (newIssueStatus) {
      await tx.issue.update({
        where: { id: assignment.issueId },
        data: { status: newIssueStatus }
      });
    }
    const currentIssue = await tx.issue.findUnique({
      where: { id: assignment.issueId }
    });
    if (currentIssue) {
      await tx.statusHistory.create({
        data: {
          issueId: assignment.issueId,
          status: newIssueStatus || currentIssue.status,
          note: historyNote,
          updatedBy: worker.name
        }
      });
    }
    return updated;
  });

  return {
    ...updatedAssignment,
    assignedAt: updatedAssignment.assignedAt.toISOString(),
    completedAt: updatedAssignment.completedAt
      ? updatedAssignment.completedAt.toISOString()
      : undefined
  };
}

