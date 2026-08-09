/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum IssueCategory {
  POTHOLE = "POTHOLE",
  STREETLIGHT = "STREETLIGHT",
  GARBAGE = "GARBAGE",
  WATER_LEAK = "WATER_LEAK",
  SEWAGE = "SEWAGE",
  ENCROACHMENT = "ENCROACHMENT",
  OTHER = "OTHER"
}

export enum IssueSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

export enum IssueStatus {
  OPEN = "OPEN",
  VERIFYING = "VERIFYING",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED"
}

/** Keep in sync with User.role values in prisma/schema.prisma */
export enum UserRole {
  CITIZEN = "CITIZEN",
  OFFICER = "OFFICER",
  WORKER = "WORKER",
  ADMIN = "ADMIN"
}

/** Keep in sync with EvidenceUpload.stage values */
export enum EvidenceStage {
  REPORT = "REPORT",
  BEFORE = "BEFORE",
  AFTER = "AFTER",
  VERIFICATION = "VERIFICATION"
}

/** Keep in sync with WorkerAssignment.status values */
export enum AssignmentStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED"
}

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  city: string;
  ward?: string;
}

export interface User {
  id: string;
  phone?: string | null;
  name: string;
  email?: string;
  role: UserRole;
  city?: string;
  ward?: string;
  department?: string;
  points: number;
  trustScore: number;
  badges: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
}

export interface StatusHistory {
  id?: string;
  status: IssueStatus;
  updatedAt: string;
  note?: string;
  updatedBy: string;
}

export interface EvidenceUpload {
  id: string;
  issueId: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedByRole: UserRole | string;
  fileUrl: string;
  fileType: string;
  caption?: string;
  uploadedAt: string;
  stage: EvidenceStage | string;
}

export interface AIAnalysisResult {
  detectedCategory: IssueCategory;
  detectedSeverity: IssueSeverity;
  confidenceScore: number;
  duplicateFound: boolean;
  duplicateIssueId?: string;
  priorityScore: number;
  departmentRouting: string;
  summaryDraftEn: string;
  summaryDraftHi: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  location: LocationData;
  imageUrl?: string;
  reporterName: string;
  reporterPhone: string;
  reporterId?: string;
  upvotes: number;
  upvotedBy: string[];
  assignedDepartment?: string;
  aiAnalysis?: AIAnalysisResult;
  comments: Comment[];
  history: StatusHistory[];
  evidence?: EvidenceUpload[];
  createdAt: string;
  verificationRate: number;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  assignedDate?: string;
  completionEvidenceUrl?: string;
  beforeEvidenceUrl?: string;
  afterEvidenceUrl?: string;
  completionEvidenceNote?: string;
  verifiedByCitizen?: boolean;
  completionLat?: number;
  completionLng?: number;
  completionTimestamp?: string;
  reworkCount?: number;
  gpsVerified?: boolean;
  slaDeadline?: string;
  isEscalated?: boolean;
  voiceUrl?: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  city: string;
  points: number;
  reportsCount: number;
  badges: string[];
}

export interface Worker {
  id: string;
  name: string;
  skill: "Electrician" | "Plumber" | "Road Repair Technician" | "Sanitation Worker" | "Water Pipeline Technician" | "Streetlight Technician";
  phone: string;
  ward: string;
  rating: number;
  completedTasks: number;
  availabilityStatus: "AVAILABLE" | "BUSY" | "OFFLINE";
}
