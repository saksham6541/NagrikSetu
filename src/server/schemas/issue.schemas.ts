import { z } from "zod";

const locationSchema = z.object({
  lat: z.number().finite(),
  lng: z.number().finite(),
  address: z.string().min(1),
  city: z.string().min(1),
  ward: z.string().optional()
});

const aiAnalysisSchema = z
  .object({
    detectedCategory: z.string().optional(),
    detectedSeverity: z.string().optional(),
    confidenceScore: z.number().optional(),
    duplicateFound: z.boolean().optional(),
    duplicateIssueId: z.string().nullable().optional(),
    priorityScore: z.number().optional(),
    departmentRouting: z.string().optional(),
    summaryDraftEn: z.string().optional(),
    summaryDraftHi: z.string().optional()
  })
  .optional();

export const createIssueSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().min(5, "Description is required"),
  category: z.string().optional(),
  severity: z.string().optional(),
  location: locationSchema,
  imageUrl: z.string().optional(),
  voiceUrl: z.string().nullable().optional(),
  aiAnalysis: aiAnalysisSchema
});

export const statusUpdateSchema = z.object({
  status: z.enum(["OPEN", "VERIFYING", "ASSIGNED", "IN_PROGRESS", "RESOLVED"]),
  note: z.string().max(2000).optional(),
  assignedDepartment: z.string().max(200).optional()
});

export const commentSchema = z.object({
  text: z.string().min(1, "Comment text is required").max(2000)
});

export const evidenceSchema = z.object({
  imageBase64: z.string().min(1, "imageBase64 is required"),
  stage: z.enum(["REPORT", "BEFORE", "AFTER", "VERIFICATION"]),
  caption: z.string().max(500).optional(),
  mimeType: z.string().optional()
});

export const assignWorkerSchema = z.object({
  workerId: z.string().min(1, "Worker ID is required"),
  notes: z.string().max(1000).optional()
});

export const assignmentUpdateSchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"]),
  notes: z.string().max(1000).optional()
});
