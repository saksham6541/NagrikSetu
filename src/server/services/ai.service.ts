import { GoogleGenAI } from "@google/genai";
import { prisma } from "../../db";
import {
  AIAnalysisResult,
  IssueCategory,
  IssueSeverity,
  IssueStatus
} from "../../types";
import { GEMINI_MODEL } from "../lib/config";
import { logger } from "../lib/logger";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } }
        });
        logger.info("Gemini GenAI SDK initialized");
      } catch (err) {
        logger.error({ err }, "Failed to initialize Gemini Client");
      }
    } else {
      logger.warn("GEMINI_API_KEY not configured. Using local analysis fallback.");
    }
  }
  return aiClient;
}

export function runLocalRuleAnalysis(title: string, description: string): AIAnalysisResult {
  const combined = `${title} ${description}`.toLowerCase();
  let detectedCategory = IssueCategory.OTHER;
  let departmentRouting = "General Ward Grievance Cell";

  if (combined.includes("pothole") || combined.includes("road")) {
    detectedCategory = IssueCategory.POTHOLE;
    departmentRouting = "Municipal Road Works Division (BBMP/PWD)";
  } else if (combined.includes("light") || combined.includes("lamp")) {
    detectedCategory = IssueCategory.STREETLIGHT;
    departmentRouting = "Electrical and Street Lighting Authority";
  } else if (combined.includes("garbage") || combined.includes("waste")) {
    detectedCategory = IssueCategory.GARBAGE;
    departmentRouting = "Solid Waste Management and Sanitation Department";
  } else if (combined.includes("water") || combined.includes("leak")) {
    detectedCategory = IssueCategory.WATER_LEAK;
    departmentRouting = "Water Supply and Sewerage Board";
  } else if (combined.includes("sewage") || combined.includes("drain")) {
    detectedCategory = IssueCategory.SEWAGE;
    departmentRouting = "Drainage and Wastewater Division";
  } else if (combined.includes("encroach")) {
    detectedCategory = IssueCategory.ENCROACHMENT;
    departmentRouting = "Town Planning and Encroachment Removal Squad";
  }

  let detectedSeverity = IssueSeverity.MEDIUM;
  if (combined.includes("urgent") || combined.includes("danger") || combined.includes("critical")) {
    detectedSeverity = IssueSeverity.CRITICAL;
  } else if (combined.includes("severe") || combined.includes("major")) {
    detectedSeverity = IssueSeverity.HIGH;
  } else if (combined.includes("minor") || combined.includes("small")) {
    detectedSeverity = IssueSeverity.LOW;
  }

  const priorityScore =
    detectedSeverity === IssueSeverity.CRITICAL
      ? 90
      : detectedSeverity === IssueSeverity.HIGH
        ? 70
        : detectedSeverity === IssueSeverity.MEDIUM
          ? 50
          : 30;

  return {
    detectedCategory,
    detectedSeverity,
    confidenceScore: 0.85,
    duplicateFound: false,
    priorityScore,
    departmentRouting,
    summaryDraftEn: `AI auto-detected ${detectedCategory.toLowerCase()} issue with ${detectedSeverity.toLowerCase()} urgency. Routed to ${departmentRouting}.`,
    summaryDraftHi: `एआई द्वारा ${detectedCategory.toLowerCase()} शिकायत पहचानी गई। विभाग: ${departmentRouting}।`
  };
}

export async function analyzeDraft(input: {
  title?: string;
  description: string;
  image?: string;
  location?: { lat?: number; lng?: number };
}): Promise<AIAnalysisResult> {
  const { title, description, image, location } = input;

  let duplicateFound = false;
  let duplicateIssueId: string | undefined;

  if (location && typeof location.lat === "number" && typeof location.lng === "number") {
    const delta = 0.005;
    const candidates = await prisma.issue.findMany({
      where: {
        status: { not: IssueStatus.RESOLVED },
        lat: { gte: location.lat - delta, lte: location.lat + delta },
        lng: { gte: location.lng - delta, lte: location.lng + delta }
      }
    });
    if (candidates.length > 0) {
      duplicateFound = true;
      duplicateIssueId = candidates[0].id;
    }
  }

  const ai = getGeminiClient();
  if (!ai) {
    const local = runLocalRuleAnalysis(title || "", description);
    local.duplicateFound = duplicateFound;
    local.duplicateIssueId = duplicateIssueId;
    return local;
  }

  try {
    const prompt = `You are a civic issue classifier for Indian municipal governments (BBMP etc).
Analyze this citizen report and return JSON only.
Title: ${title || ""}
Description: ${description}
Return a raw JSON object with keys: detectedCategory, detectedSeverity, confidenceScore (0-1), priorityScore (0-100), departmentRouting, summaryDraftEn, summaryDraftHi.
Categories: POTHOLE, STREETLIGHT, GARBAGE, WATER_LEAK, SEWAGE, ENCROACHMENT, OTHER.
Severities: LOW, MEDIUM, HIGH, CRITICAL.`;

    let contentResponse: any;
    if (image) {
      const base64Data = image.includes(",") ? image.split(",")[1] : image;
      const mimeType = image.startsWith("data:")
        ? image.slice(5, image.indexOf(";"))
        : "image/jpeg";
      contentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }],
        config: { responseMimeType: "application/json" }
      });
    } else {
      contentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
    }

    const text = contentResponse.text || "{}";
    const result = JSON.parse(
      text.replace(/```json/g, "").replace(/```/g, "").trim()
    ) as AIAnalysisResult;
    result.duplicateFound = duplicateFound;
    result.duplicateIssueId = duplicateIssueId;
    return result;
  } catch (err) {
    logger.error({ err }, "Gemini analysis error, falling back to local");
    const local = runLocalRuleAnalysis(title || "", description);
    local.duplicateFound = duplicateFound;
    local.duplicateIssueId = duplicateIssueId;
    return local;
  }
}
