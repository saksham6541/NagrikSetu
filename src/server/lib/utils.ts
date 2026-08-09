import {
  Issue, IssueCategory, IssueSeverity, IssueStatus, User, UserRole, EvidenceStage, AIAnalysisResult
} from "../../types";

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getSlaHours(severity: IssueSeverity): number {
  switch (severity) {
    case IssueSeverity.CRITICAL: return 12;
    case IssueSeverity.HIGH: return 24;
    case IssueSeverity.MEDIUM: return 48;
    case IssueSeverity.LOW: return 72;
    default: return 48;
  }
}

export const issueInclude = {
  comments: { orderBy: { createdAt: "asc" as const } },
  history: { orderBy: { updatedAt: "asc" as const } },
  evidence: { orderBy: { uploadedAt: "asc" as const } },
  aiAnalysis: true,
  votes: true
};

export function formatUserFromDb(user: any): User {
  let badges: string[] = [];
  try {
    badges = typeof user.badges === "string" ? JSON.parse(user.badges) : (user.badges || []);
  } catch {
    badges = [];
  }
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email || undefined,
    role: user.role as UserRole,
    city: user.city || undefined,
    ward: user.ward || undefined,
    department: user.department || undefined,
    points: user.points,
    trustScore: user.trustScore,
    badges,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt
  };
}

export function formatIssueFromDb(issue: any): Issue {
  const upvotedBy = issue.votes ? issue.votes.map((v: any) => v.voterIdentifier) : [];
  const comments = (issue.comments || []).map((c: any) => ({
    id: c.id,
    authorName: c.authorName,
    authorRole: c.authorRole as UserRole,
    text: c.text,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt
  }));
  const history = (issue.history || []).map((h: any) => ({
    id: h.id,
    status: h.status as IssueStatus,
    updatedAt: h.updatedAt instanceof Date ? h.updatedAt.toISOString() : h.updatedAt,
    note: h.note || undefined,
    updatedBy: h.updatedBy
  }));
  const evidence = (issue.evidence || []).map((e: any) => ({
    id: e.id,
    issueId: e.issueId,
    uploadedBy: e.uploadedBy,
    uploadedByName: e.uploadedByName,
    uploadedByRole: e.uploadedByRole as UserRole,
    fileUrl: e.fileUrl,
    fileType: e.fileType,
    caption: e.caption || undefined,
    uploadedAt: e.uploadedAt instanceof Date ? e.uploadedAt.toISOString() : e.uploadedAt,
    stage: e.stage as EvidenceStage
  }));
  const aiAnalysis: AIAnalysisResult | undefined = issue.aiAnalysis
    ? {
        detectedCategory: issue.aiAnalysis.detectedCategory as IssueCategory,
        detectedSeverity: issue.aiAnalysis.detectedSeverity as IssueSeverity,
        confidenceScore: issue.aiAnalysis.confidenceScore,
        duplicateFound: issue.aiAnalysis.duplicateFound,
        duplicateIssueId: issue.aiAnalysis.duplicateIssueId || undefined,
        priorityScore: issue.aiAnalysis.priorityScore,
        departmentRouting: issue.aiAnalysis.departmentRouting,
        summaryDraftEn: issue.aiAnalysis.summaryDraftEn,
        summaryDraftHi: issue.aiAnalysis.summaryDraftHi
      }
    : undefined;

  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    category: issue.category as IssueCategory,
    severity: issue.severity as IssueSeverity,
    status: issue.status as IssueStatus,
    location: {
      lat: issue.lat,
      lng: issue.lng,
      address: issue.address,
      city: issue.city,
      ward: issue.ward
    },
    imageUrl: issue.imageUrl,
    reporterName: issue.reporterName,
    reporterPhone: issue.reporterPhone,
    reporterId: issue.reporterId || undefined,
    upvotes: issue.upvotes,
    upvotedBy,
    assignedDepartment: issue.assignedDepartment || undefined,
    assignedWorkerId: issue.assignedWorkerId || undefined,
    assignedWorkerName: issue.assignedWorkerName || undefined,
    createdAt: issue.createdAt instanceof Date ? issue.createdAt.toISOString() : issue.createdAt,
    verificationRate: issue.verificationRate,
    comments,
    history,
    evidence,
    aiAnalysis,
    slaDeadline: issue.slaDeadline
      ? issue.slaDeadline instanceof Date
        ? issue.slaDeadline.toISOString()
        : issue.slaDeadline
      : undefined,
    isEscalated: !!issue.isEscalated,
    voiceUrl: issue.voiceUrl || undefined
  };
}
