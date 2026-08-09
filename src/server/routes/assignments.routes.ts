import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { UserRole, User } from "../../types";
import { assignWorkerSchema, assignmentUpdateSchema } from "../schemas/issue.schemas";
import * as assignmentService from "../services/assignment.service";
import * as authService from "../services/auth.service";

const router = Router();

router.get(
  "/users/workers",
  authenticateToken,
  requireRole(UserRole.OFFICER, UserRole.ADMIN),
  asyncHandler(async (_req, res) => {
    res.json(await authService.listWorkers());
  })
);

router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    res.json(await authService.listUsers());
  })
);

router.post(
  "/issues/:id/assign-worker",
  authenticateToken,
  requireRole(UserRole.OFFICER, UserRole.ADMIN),
  validateBody(assignWorkerSchema),
  asyncHandler(async (req, res) => {
    const officer = (req as any).user as User;
    const result = await assignmentService.assignWorker(
      officer,
      req.params.id,
      req.body.workerId,
      req.body.notes
    );
    res.json(result);
  })
);

router.get(
  "/worker/my-assignments",
  authenticateToken,
  requireRole(UserRole.WORKER),
  asyncHandler(async (req, res) => {
    const worker = (req as any).user as User;
    res.json(await assignmentService.listWorkerAssignments(worker));
  })
);

router.post(
  "/assignments/:id/update",
  authenticateToken,
  requireRole(UserRole.WORKER),
  validateBody(assignmentUpdateSchema),
  asyncHandler(async (req, res) => {
    const worker = (req as any).user as User;
    const result = await assignmentService.updateAssignment(
      worker,
      req.params.id,
      req.body.status,
      req.body.notes
    );
    res.json(result);
  })
);

export default router;
