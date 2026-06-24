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

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  city: string;
  ward?: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorRole: "CITIZEN" | "AUTHORITY" | "OFFICER" | "WORKER" | "ADMIN";
  text: string;
  createdAt: string;
}

export interface StatusHistory {
  status: IssueStatus;
  updatedAt: string;
  note: string;
  updatedBy: string;
}

export interface AIAnalysisResult {
  detectedCategory: IssueCategory;
  detectedSeverity: IssueSeverity;
  confidenceScore: number;
  duplicateFound: boolean;
  duplicateIssueId?: string;
  priorityScore: number; // 0-100 calculated by algorithm
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
  upvotes: number;
  upvotedBy: string[]; // user phones to prevent duplicate voting
  assignedDepartment?: string;
  aiAnalysis?: AIAnalysisResult;
  comments: Comment[];
  history: StatusHistory[];
  createdAt: string;
  verificationRate: number; // calculated percent of community agreement
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  assignedDate?: string;
  completionEvidenceUrl?: string; // fallback
  beforeEvidenceUrl?: string;
  afterEvidenceUrl?: string;
  completionEvidenceNote?: string;
  verifiedByCitizen?: boolean;
  completionLat?: number;
  completionLng?: number;
  completionTimestamp?: string;
  reworkCount?: number;
  gpsVerified?: boolean;
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

