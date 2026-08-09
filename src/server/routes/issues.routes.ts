import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { UserRole, User, IssueStatus } from "../../types";
import {
  createIssueSchema,
  statusUpdateSchema,
  commentSchema,
  evidenceSchema
} from "../schemas/issue.schemas";
import * as issueService from "../services/issue.service";
import * as issueActions from "../services/issue-actions.service";
import * as evidenceService from "../services/evidence.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = parseInt(String(req.query.page || "1"), 10);
    const limit = parseInt(String(req.query.limit || "20"), 10);
    const result = await issueService.listIssues(page, limit);
    // Backward-compatible: frontend expects array; also support envelope
    if (req.query.page) res.json(result);
    else res.json(result.issues);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const issue = await issueService.getIssueById(req.params.id);
    res.json(issue);
  })
);

router.post(
  "/",
  authenticateToken,
  requireRole(UserRole.CITIZEN),
  validateBody(createIssueSchema),
  asyncHandler(async (req, res) => {
    const user = (req as any).user as User;
    const issue = await issueService.createIssue(user, req.body);
    res.json(issue);
  })
);

router.post(
  "/:id/vote",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = (req as any).user as User;
    const issue = await issueActions.voteOnIssue(user, req.params.id);
    res.json(issue);
  })
);

router.post(
  "/:id/comment",
  authenticateToken,
  validateBody(commentSchema),
  asyncHandler(async (req, res) => {
    const user = (req as any).user as User;
    const issue = await issueActions.addComment(user, req.params.id, req.body.text);
    res.json(issue);
  })
);

router.post(
  "/:id/status",
  authenticateToken,
  requireRole(UserRole.OFFICER, UserRole.ADMIN),
  validateBody(statusUpdateSchema),
  asyncHandler(async (req, res) => {
    const officer = (req as any).user as User;
    const issue = await issueActions.updateIssueStatus(
      officer,
      req.params.id,
      req.body.status as IssueStatus,
      req.body.note,
      req.body.assignedDepartment
    );
    res.json(issue);
  })
);

router.post(
  "/:id/evidence",
  authenticateToken,
  validateBody(evidenceSchema),
  asyncHandler(async (req, res) => {
    const user = (req as any).user as User;
    const evidence = await evidenceService.uploadEvidence(
      user,
      req.params.id,
      req.body.imageBase64,
      req.body.stage,
      req.body.caption
    );
    res.json(evidence);
  })
);

router.get(
  "/:id/evidence",
  asyncHandler(async (req, res) => {
    const evidence = await evidenceService.listEvidence(req.params.id);
    res.json(evidence);
  })
);

export default router;
