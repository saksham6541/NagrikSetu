/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Issue, 
  IssueCategory, 
  IssueSeverity, 
  IssueStatus, 
  LocationData,
  AIAnalysisResult,
  Comment,
  StatusHistory
} from "./src/types";

// Initialize Gemini Client Lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            }
          }
        });
        console.log("Successfully initialized Gemini GenAI SDK.");
      } catch (err) {
        console.error("Failed to initialize Gemini Client:", err);
      }
    } else {
      console.warn("GEMINI_API_KEY is not configured or holds placeholder. Using intelligent local analysis fallback.");
    }
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

const DATA_FILE = path.join(process.cwd(), "data.json");

// Helper: Haversine distance in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

// Initial seed data representing real issues in India
const SEED_ISSUES: Issue[] = [
  {
    id: "issue-1",
    title: "Large Pothole near Central Market Crossing",
    description: "A huge pothole has formed in the middle of the main crossing. It is causing massive traffic jams during peak hours and is highly dangerous for two-wheelers, especially during night or rain.",
    category: IssueCategory.POTHOLE,
    severity: IssueSeverity.HIGH,
    status: IssueStatus.ASSIGNED,
    location: {
      lat: 12.9348,
      lng: 77.6114,
      address: "80 Feet Road, Koramangala 4th Block, near Market Plaza",
      city: "Bengaluru",
      ward: "Ward 151 (Koramangala)"
    },
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80", // Placeholder but realistic
    reporterName: "Rajesh Kumar",
    reporterPhone: "+91 98765 43210",
    upvotes: 42,
    upvotedBy: ["+91 98765 43210", "+91 81234 56789"],
    assignedDepartment: "Municipal Road Works Division (BBMP)",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    verificationRate: 94,
    comments: [
      {
        id: "c1",
        authorName: "Ananya Sharma",
        authorRole: "CITIZEN",
        text: "Yes, I saw a scooter slip here yesterday. Highly critical to get this patched up before monsoon hits full swing!",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "c2",
        authorName: "Officer Vignesh",
        authorRole: "AUTHORITY",
        text: "Report acknowledged and routed to BBMP Koramangala Subdivision. Repair team assigned.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    history: [
      {
        status: IssueStatus.OPEN,
        updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Issue reported by citizen Rajesh Kumar",
        updatedBy: "Rajesh Kumar"
      },
      {
        status: IssueStatus.VERIFYING,
        updatedAt: new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Community threshold reached. Status marked as Verifying.",
        updatedBy: "System Engine"
      },
      {
        status: IssueStatus.ASSIGNED,
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Assigned to Municipal Road Works Division (BBMP) with high priority scoring.",
        updatedBy: "Officer Vignesh"
      }
    ],
    aiAnalysis: {
      detectedCategory: IssueCategory.POTHOLE,
      detectedSeverity: IssueSeverity.HIGH,
      confidenceScore: 0.95,
      duplicateFound: false,
      priorityScore: 84,
      departmentRouting: "Municipal Road Works Division (BBMP)",
      summaryDraftEn: "A high-risk pothole reported on 80 Feet Road Koramangala. Active traffic risk and community consensus verified.",
      summaryDraftHi: "कोरामंगला ८० फीट रोड पर एक उच्च जोखिम वाला गड्ढा दर्ज किया गया है। यातायात के लिए गंभीर खतरा और सामुदायिक सत्यापन पूर्ण।"
    }
  },
  {
    id: "issue-2",
    title: "Broken Streetlight near Children's Park Entrance",
    description: "The street light right outside the neighborhood park entrance has been non-functional for over a week. The entire corner gets completely dark after 7 PM, making it unsafe for kids and senior citizens who walk there.",
    category: IssueCategory.STREETLIGHT,
    severity: IssueSeverity.MEDIUM,
    status: IssueStatus.OPEN,
    location: {
      lat: 26.8467,
      lng: 80.9462,
      address: "Sector H, Aliganj Park Road",
      city: "Lucknow",
      ward: "Ward 45 (Aliganj)"
    },
    imageUrl: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=600&q=80",
    reporterName: "Priya Bajpai",
    reporterPhone: "+91 76543 21098",
    upvotes: 18,
    upvotedBy: ["+91 76543 21098"],
    assignedDepartment: "Electrical and Street Lighting Authority (LMC)",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    verificationRate: 72,
    comments: [],
    history: [
      {
        status: IssueStatus.OPEN,
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Issue submitted by resident Priya Bajpai",
        updatedBy: "Priya Bajpai"
      }
    ],
    aiAnalysis: {
      detectedCategory: IssueCategory.STREETLIGHT,
      detectedSeverity: IssueSeverity.MEDIUM,
      confidenceScore: 0.92,
      duplicateFound: false,
      priorityScore: 62,
      departmentRouting: "Electrical and Street Lighting Authority (LMC)",
      summaryDraftEn: "Streetlight malfunction reported at Aliganj Children's Park entrance, creating safety vulnerabilities after dark.",
      summaryDraftHi: "अलीगंज चिल्ड्रन्स पार्क के प्रवेश द्वार पर स्ट्रीटलाइट खराब होने की शिकायत, अंधेरे के बाद सुरक्षा संबंधी खतरा।"
    }
  },
  {
    id: "issue-3",
    title: "Illegal Waste Dumping in Sector 62 Main Alley",
    description: "People are throwing commercial plastic waste and food leftovers on the side of the road. It has accumulated into a small pile, attracting stray animals, creating a terrible smell, and blocking the pedestrian sidewalk.",
    category: IssueCategory.GARBAGE,
    severity: IssueSeverity.HIGH,
    status: IssueStatus.IN_PROGRESS,
    location: {
      lat: 28.6282,
      lng: 77.3769,
      address: "C-Block Lane, Sector 62, near Metro Pillar 12",
      city: "Delhi-NCR",
      ward: "Noida Sector 62 Area"
    },
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
    reporterName: "Amit Sharma",
    reporterPhone: "+91 99999 88888",
    upvotes: 35,
    upvotedBy: ["+91 99999 88888"],
    assignedDepartment: "Solid Waste Management and Sanitation (Noida Authority)",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    verificationRate: 88,
    comments: [
      {
        id: "c3",
        authorName: "Vijay Yadav",
        authorRole: "CITIZEN",
        text: "There is a vegetable shop nearby that throws everything here. Sanitation department needs to fine them.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "c4",
        authorName: "Sanitation Supervisor",
        authorRole: "AUTHORITY",
        text: "Cleanliness crew dispatched with a waste transport dumper. Clearing is underway, and a warning board is being installed.",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    history: [
      {
        status: IssueStatus.OPEN,
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Issue registered by citizen Amit Sharma",
        updatedBy: "Amit Sharma"
      },
      {
        status: IssueStatus.ASSIGNED,
        updatedAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Assigned to Noida Authority Sanitation Department",
        updatedBy: "System Routing Engine"
      },
      {
        status: IssueStatus.IN_PROGRESS,
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Sanitation team on-site. Waste collection and container placement underway.",
        updatedBy: "Sanitation Supervisor"
      }
    ],
    aiAnalysis: {
      detectedCategory: IssueCategory.GARBAGE,
      detectedSeverity: IssueSeverity.HIGH,
      confidenceScore: 0.97,
      duplicateFound: false,
      priorityScore: 78,
      departmentRouting: "Solid Waste Management and Sanitation (Noida Authority)",
      summaryDraftEn: "Accumulation of commercial and plastic waste blocking public pavement near Sector 62 Metro Pillar 12.",
      summaryDraftHi: "सेक्टर ६२ मेट्रो पिलर १२ के पास सार्वजनिक फुटपाथ को अवरुद्ध करते हुए व्यावसायिक और प्लास्टिक कचरे का जमाव।"
    }
  },
  {
    id: "issue-4",
    title: "Major Water Main Pipe Leakage flooding the road",
    description: "Water is gushing out from an underground municipal pipeline junction. Thousands of liters of clean drinking water are being wasted, and the entire residential road is flooded with 4-5 inches of water.",
    category: IssueCategory.WATER_LEAK,
    severity: IssueSeverity.CRITICAL,
    status: IssueStatus.RESOLVED,
    location: {
      lat: 19.0760,
      lng: 72.8777,
      address: "Rambagh Lane, Santacruz East",
      city: "Mumbai",
      ward: "Ward H-East (MCGM)"
    },
    imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80",
    reporterName: "Vikram Sawant",
    reporterPhone: "+91 91234 56780",
    upvotes: 68,
    upvotedBy: ["+91 91234 56780"],
    assignedDepartment: "Water Supply and Sewerage Board (MCGM)",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    verificationRate: 98,
    comments: [
      {
        id: "c5",
        authorName: "Meera Deshmukh",
        authorRole: "CITIZEN",
        text: "Clean water supply in our colony has stopped since this leak started. Please fix urgently!",
        createdAt: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "c6",
        authorName: "MCGM Engineer",
        authorRole: "AUTHORITY",
        text: "Water valve turned off to prevent wasting. Welding repair team is on-site patching the cracked iron pipe.",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "c7",
        authorName: "Vikram Sawant",
        authorRole: "CITIZEN",
        text: "Fantastic job! Pipe is fully patched and supply restored. The road has dried up. Thank you NagrikSetu and MCGM!",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    history: [
      {
        status: IssueStatus.OPEN,
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Issue reported by citizen Vikram Sawant",
        updatedBy: "Vikram Sawant"
      },
      {
        status: IssueStatus.VERIFYING,
        updatedAt: new Date(Date.now() - 4.8 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Verified by 10+ nearby residents within 1 hour.",
        updatedBy: "System Consensus Engine"
      },
      {
        status: IssueStatus.ASSIGNED,
        updatedAt: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Assigned to MCGM Santacruz Water Supply Division with critical urgency score.",
        updatedBy: "Officer Meenal"
      },
      {
        status: IssueStatus.IN_PROGRESS,
        updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Welding repairs in progress. Water flow diverted.",
        updatedBy: "MCGM Engineer"
      },
      {
        status: IssueStatus.RESOLVED,
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Pipe welded and leak sealed. Road cleared and water pressure normalized.",
        updatedBy: "MCGM Engineer"
      }
    ],
    aiAnalysis: {
      detectedCategory: IssueCategory.WATER_LEAK,
      detectedSeverity: IssueSeverity.CRITICAL,
      confidenceScore: 0.98,
      duplicateFound: false,
      priorityScore: 96,
      departmentRouting: "Water Supply and Sewerage Board (MCGM)",
      summaryDraftEn: "Critical water supply pipe burst causing massive road flooding and localized utility outage in Santacruz East.",
      summaryDraftHi: "सांताक्रूज़ पूर्व में गंभीर जल आपूर्ति पाइप फटने से बड़े पैमाने पर सड़क पर पानी भरा और स्थानीय आपूर्ति बाधित।"
    }
  }
];

// Load issues from data.json or populate with seeds
function loadIssues(): Issue[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(content);
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_ISSUES, null, 2), "utf-8");
      return SEED_ISSUES;
    }
  } catch (err) {
    console.error("Error loading issues file:", err);
    return SEED_ISSUES;
  }
}

// Save issues to data.json
function saveIssues(issues: Issue[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(issues, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving issues file:", err);
  }
}

// RESTful API Routes

// 1. GET all issues
app.get("/api/issues", (req, res) => {
  const issues = loadIssues();
  res.json(issues);
});

// 2. GET single issue
app.get("/api/issues/:id", (req, res) => {
  const issues = loadIssues();
  const issue = issues.find(i => i.id === req.params.id);
  if (!issue) {
    return res.status(404).json({ error: "Issue not found" });
  }
  res.json(issue);
});

// 3. POST upvote/verify issue
app.post("/api/issues/:id/vote", (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required to verify an issue." });
  }

  const issues = loadIssues();
  const issueIndex = issues.findIndex(i => i.id === req.params.id);
  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const issue = issues[issueIndex];
  if (issue.upvotedBy.includes(phone)) {
    return res.status(400).json({ error: "You have already upvoted/verified this issue." });
  }

  issue.upvotes += 1;
  issue.upvotedBy.push(phone);
  
  // Calculate dynamic community verification rate
  // Let's assume 20 upvotes represents 100% community verification confidence
  issue.verificationRate = Math.min(Math.round((issue.upvotes / 20) * 100), 100);

  // If status is OPEN and verification rate crosses 50%, auto-promote to VERIFYING
  if (issue.status === IssueStatus.OPEN && issue.verificationRate >= 50) {
    issue.status = IssueStatus.VERIFYING;
    issue.history.push({
      status: IssueStatus.VERIFYING,
      updatedAt: new Date().toISOString(),
      note: "Community upvote threshold reached. Auto-promoted to Verifying.",
      updatedBy: "System Consensus Engine"
    });
  }

  issues[issueIndex] = issue;
  saveIssues(issues);
  res.json(issue);
});

// 4. POST comment on issue
app.post("/api/issues/:id/comment", (req, res) => {
  const { authorName, authorRole, text } = req.body;
  if (!authorName || !text) {
    return res.status(400).json({ error: "Author name and comment text are required." });
  }

  const issues = loadIssues();
  const issueIndex = issues.findIndex(i => i.id === req.params.id);
  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const issue = issues[issueIndex];
  const newComment: Comment = {
    id: `comment-${Date.now()}`,
    authorName,
    authorRole: authorRole || "CITIZEN",
    text,
    createdAt: new Date().toISOString()
  };

  issue.comments.push(newComment);
  issues[issueIndex] = issue;
  saveIssues(issues);
  res.json(issue);
});

// 5. POST update issue status (Authority control)
app.post("/api/issues/:id/status", (req, res) => {
  const { status, note, updatedBy, assignedDepartment } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Status is required." });
  }

  const issues = loadIssues();
  const issueIndex = issues.findIndex(i => i.id === req.params.id);
  if (issueIndex === -1) {
    return res.status(404).json({ error: "Issue not found" });
  }

  const issue = issues[issueIndex];
  issue.status = status as IssueStatus;
  
  if (assignedDepartment) {
    issue.assignedDepartment = assignedDepartment;
  }

  // Support assignment & verification properties
  if (req.body.assignedWorkerId !== undefined) {
    issue.assignedWorkerId = req.body.assignedWorkerId;
  }
  if (req.body.assignedWorkerName !== undefined) {
    issue.assignedWorkerName = req.body.assignedWorkerName;
  }
  if (req.body.assignedDate !== undefined) {
    issue.assignedDate = req.body.assignedDate;
  }
  if (req.body.completionEvidenceUrl !== undefined) {
    issue.completionEvidenceUrl = req.body.completionEvidenceUrl;
  }
  if (req.body.beforeEvidenceUrl !== undefined) {
    issue.beforeEvidenceUrl = req.body.beforeEvidenceUrl;
  }
  if (req.body.afterEvidenceUrl !== undefined) {
    issue.afterEvidenceUrl = req.body.afterEvidenceUrl;
  }
  if (req.body.completionEvidenceNote !== undefined) {
    issue.completionEvidenceNote = req.body.completionEvidenceNote;
  }
  if (req.body.verifiedByCitizen !== undefined) {
    issue.verifiedByCitizen = req.body.verifiedByCitizen;
  }
  if (req.body.severity !== undefined) {
    issue.severity = req.body.severity;
  }
  if (req.body.completionLat !== undefined) {
    issue.completionLat = req.body.completionLat;
  }
  if (req.body.completionLng !== undefined) {
    issue.completionLng = req.body.completionLng;
  }
  if (req.body.completionTimestamp !== undefined) {
    issue.completionTimestamp = req.body.completionTimestamp;
  }
  if (req.body.reworkCount !== undefined) {
    issue.reworkCount = req.body.reworkCount;
  }
  if (req.body.gpsVerified !== undefined) {
    issue.gpsVerified = req.body.gpsVerified;
  }

  issue.history.push({
    status: status as IssueStatus,
    updatedAt: new Date().toISOString(),
    note: note || `Status updated to ${status}`,
    updatedBy: updatedBy || "Government Authority"
  });

  issues[issueIndex] = issue;
  saveIssues(issues);
  res.json(issue);
});

// Local AI Rule-Based fallback analysis helper
function runLocalRuleAnalysis(title: string, description: string): AIAnalysisResult {
  const combined = `${title} ${description}`.toLowerCase();
  
  let detectedCategory = IssueCategory.OTHER;
  let departmentRouting = "General Ward Grievance Cell";
  
  if (combined.includes("pothole") || combined.includes("potholes") || combined.includes("road") || combined.includes("gaddhe") || combined.includes("sadak")) {
    detectedCategory = IssueCategory.POTHOLE;
    departmentRouting = "Municipal Road Works Division (BBMP/PWD)";
  } else if (combined.includes("light") || combined.includes("streetlight") || combined.includes("dark") || combined.includes("electricity") || combined.includes("bijli")) {
    detectedCategory = IssueCategory.STREETLIGHT;
    departmentRouting = "Electrical and Street Lighting Authority";
  } else if (combined.includes("garbage") || combined.includes("waste") || combined.includes("dump") || combined.includes("trash") || combined.includes("kachra")) {
    detectedCategory = IssueCategory.GARBAGE;
    departmentRouting = "Solid Waste Management and Sanitation Department";
  } else if (combined.includes("leak") || combined.includes("pipe") || combined.includes("water") || combined.includes("pani")) {
    detectedCategory = IssueCategory.WATER_LEAK;
    departmentRouting = "Water Supply and Sewerage Board";
  } else if (combined.includes("sewage") || combined.includes("drain") || combined.includes("gutter") || combined.includes("nalv")) {
    detectedCategory = IssueCategory.SEWAGE;
    departmentRouting = "Drainage and Wastewater Division";
  } else if (combined.includes("encroach") || combined.includes("illegal") || combined.includes("sidewalk") || combined.includes("shop")) {
    detectedCategory = IssueCategory.ENCROACHMENT;
    departmentRouting = "Town Planning and Encroachment Removal Squad";
  }

  let detectedSeverity = IssueSeverity.MEDIUM;
  let priorityScore = 50;

  if (combined.includes("accident") || combined.includes("danger") || combined.includes("flood") || combined.includes("critical") || combined.includes("gushing") || combined.includes("khathra")) {
    detectedSeverity = IssueSeverity.CRITICAL;
    priorityScore = 92;
  } else if (combined.includes("severe") || combined.includes("large") || combined.includes("huge") || combined.includes("broken") || combined.includes("high")) {
    detectedSeverity = IssueSeverity.HIGH;
    priorityScore = 78;
  } else if (combined.includes("minor") || combined.includes("small") || combined.includes("low")) {
    detectedSeverity = IssueSeverity.LOW;
    priorityScore = 25;
  }

  return {
    detectedCategory,
    detectedSeverity,
    confidenceScore: 0.85,
    duplicateFound: false,
    priorityScore,
    departmentRouting,
    summaryDraftEn: `AI auto-detected ${detectedCategory.toLowerCase()} issue with ${detectedSeverity.toLowerCase()} urgency. routed to ${departmentRouting}.`,
    summaryDraftHi: `एआई द्वारा संचालित ${detectedCategory.toLowerCase()} संबंधित शिकायत की पहचान हुई। उचित विभाग: ${departmentRouting}।`
  };
}

// 6. POST Analyze draft issue using Gemini AI or Local Fallback
app.post("/api/ai/analyze-draft", async (req, res) => {
  const { title, description, image, location } = req.body;
  if (!description) {
    return res.status(400).json({ error: "Issue description is required for AI categorization." });
  }

  // Calculate distance duplicate detection
  const issues = loadIssues();
  let duplicateFound = false;
  let duplicateIssueId: string | undefined;

  if (location && location.lat && location.lng) {
    for (const existing of issues) {
      if (existing.status !== IssueStatus.RESOLVED) {
        const dist = getDistanceInMeters(
          location.lat, 
          location.lng, 
          existing.location.lat, 
          existing.location.lng
        );
        // Duplicate if within 500 meters and same general category or descriptions are similar
        if (dist <= 500) {
          duplicateFound = true;
          duplicateIssueId = existing.id;
          break;
        }
      }
    }
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Graceful fallback if Gemini API is not initialized
    const localResult = runLocalRuleAnalysis(title || "", description);
    localResult.duplicateFound = duplicateFound;
    localResult.duplicateIssueId = duplicateIssueId;
    return res.json(localResult);
  }

  try {
    const prompt = `
      You are an expert AI civic assistant for an Indian municipality platform called "NagrikSetu".
      Analyze the following community issue details and classify it.
      
      TITLE: ${title || "Not provided"}
      DESCRIPTION: ${description}
      
      We have the following exact IssueCategories (enum strings):
      - "POTHOLE"
      - "STREETLIGHT"
      - "GARBAGE"
      - "WATER_LEAK"
      - "SEWAGE"
      - "ENCROACHMENT"
      - "OTHER"
      
      We have the following exact IssueSeverities (enum strings):
      - "LOW"
      - "MEDIUM"
      - "HIGH"
      - "CRITICAL"

      Return a raw JSON object containing these exact keys (ensure valid JSON types, no markdown formatting wrap, just plain text JSON):
      {
        "detectedCategory": "POTHOLE" | "STREETLIGHT" | "GARBAGE" | "WATER_LEAK" | "SEWAGE" | "ENCROACHMENT" | "OTHER",
        "detectedSeverity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "confidenceScore": number (0.0 to 1.0),
        "priorityScore": number (0 to 100 representing urgency score based on hazard, traffic impact, and safety risk),
        "departmentRouting": string (the exact local municipal department to send this to, e.g. "Municipal Works Dept (BBMP)", "Power & lighting Corporation", "Sanitation & Waste Management Division", etc.),
        "summaryDraftEn": string (a precise professional single-sentence brief summary for the government authority in English),
        "summaryDraftHi": string (a precise professional single-sentence brief summary in formal Hindi)
      }
    `;

    let contentResponse;
    if (image && image.startsWith("data:")) {
      // Process image input if provided
      const mimeType = image.split(";")[0].split(":")[1];
      const base64Data = image.split(",")[1];
      
      contentResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });
    } else {
      contentResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
    }

    const text = contentResponse.text || "{}";
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanedText) as AIAnalysisResult;
    
    // Inject duplicate detection
    result.duplicateFound = duplicateFound;
    result.duplicateIssueId = duplicateIssueId;
    
    res.json(result);
  } catch (err) {
    console.error("Gemini analysis error, falling back to local:", err);
    const localResult = runLocalRuleAnalysis(title || "", description);
    localResult.duplicateFound = duplicateFound;
    localResult.duplicateIssueId = duplicateIssueId;
    res.json(localResult);
  }
});

// 7. POST Create issue
app.post("/api/issues", (req, res) => {
  const { 
    title, 
    description, 
    category, 
    severity, 
    location, 
    imageUrl, 
    reporterName, 
    reporterPhone,
    aiAnalysis
  } = req.body;

  if (!title || !description || !location || !reporterName || !reporterPhone) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const issues = loadIssues();
  const newIssue: Issue = {
    id: `issue-${Date.now()}`,
    title,
    description,
    category: category || IssueCategory.OTHER,
    severity: severity || IssueSeverity.MEDIUM,
    status: IssueStatus.OPEN,
    location,
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80",
    reporterName,
    reporterPhone,
    upvotes: 1,
    upvotedBy: [reporterPhone],
    assignedDepartment: aiAnalysis?.departmentRouting || "General Ward Grievance Cell",
    aiAnalysis: aiAnalysis,
    comments: [],
    history: [
      {
        status: IssueStatus.OPEN,
        updatedAt: new Date().toISOString(),
        note: `Issue reported by citizen ${reporterName}.`,
        updatedBy: reporterName
      }
    ],
    createdAt: new Date().toISOString(),
    verificationRate: 5 // initial
  };

  issues.unshift(newIssue);
  saveIssues(issues);
  res.json(newIssue);
});

// 8. GET analytics aggregate data
app.get("/api/analytics", (req, res) => {
  const issues = loadIssues();
  const total = issues.length;
  const resolved = issues.filter(i => i.status === IssueStatus.RESOLVED).length;
  const inProgress = issues.filter(i => i.status === IssueStatus.IN_PROGRESS).length;
  const open = issues.filter(i => i.status === IssueStatus.OPEN || i.status === IssueStatus.VERIFYING || i.status === IssueStatus.ASSIGNED).length;

  // Department metrics
  const deptMap: { [key: string]: { total: number, resolved: number, timeSum: number } } = {};
  
  issues.forEach(i => {
    const dept = i.assignedDepartment || "General Ward Grievance Cell";
    if (!deptMap[dept]) {
      deptMap[dept] = { total: 0, resolved: 0, timeSum: 0 };
    }
    deptMap[dept].total += 1;
    if (i.status === IssueStatus.RESOLVED) {
      deptMap[dept].resolved += 1;
      // Calculate resolution time in hours (simulated or real from history logs)
      const openTime = new Date(i.createdAt).getTime();
      const resolveHistory = i.history.find(h => h.status === IssueStatus.RESOLVED);
      const resolveTime = resolveHistory ? new Date(resolveHistory.updatedAt).getTime() : Date.now();
      const diffHrs = Math.max(Math.round((resolveTime - openTime) / (1000 * 60 * 60)), 1);
      deptMap[dept].timeSum += diffHrs;
    }
  });

  const departmentPerformance = Object.keys(deptMap).map(name => {
    const d = deptMap[name];
    const avgHrs = d.resolved > 0 ? Math.round(d.timeSum / d.resolved) : 24; // fallback 24h
    return {
      name,
      totalIssues: d.total,
      resolvedIssues: d.resolved,
      resolutionRate: d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0,
      avgResolutionTimeHrs: avgHrs
    };
  });

  // Calculate resolution times per category
  const catMap: { [key: string]: { count: number, totalHrs: number } } = {};
  issues.forEach(i => {
    if (i.status === IssueStatus.RESOLVED) {
      const openTime = new Date(i.createdAt).getTime();
      const resolveHistory = i.history.find(h => h.status === IssueStatus.RESOLVED);
      const resolveTime = resolveHistory ? new Date(resolveHistory.updatedAt).getTime() : Date.now();
      const diffHrs = Math.max(Math.round((resolveTime - openTime) / (1000 * 60 * 60)), 1);

      if (!catMap[i.category]) {
        catMap[i.category] = { count: 0, totalHrs: 0 };
      }
      catMap[i.category].count += 1;
      catMap[i.category].totalHrs += diffHrs;
    }
  });

  const categoryResolutionTimes = Object.keys(catMap).map(cat => ({
    category: cat,
    avgHrs: Math.round(catMap[cat].totalHrs / catMap[cat].count)
  }));

  // Identify hotspots (K-Means simplified grouping of close issues)
  const hotspots: any[] = [];
  issues.forEach(issue => {
    // Check if close to an existing hotspot group within 500 meters
    let found = false;
    for (const h of hotspots) {
      const dist = getDistanceInMeters(issue.location.lat, issue.location.lng, h.lat, h.lng);
      if (dist <= 500) {
        h.count += 1;
        h.issues.push(issue.id);
        if (issue.severity === IssueSeverity.CRITICAL || issue.severity === IssueSeverity.HIGH) {
          h.highSeverityCount += 1;
        }
        found = true;
        break;
      }
    }
    if (!found) {
      hotspots.push({
        city: issue.location.city,
        address: issue.location.address,
        lat: issue.location.lat,
        lng: issue.location.lng,
        count: 1,
        highSeverityCount: (issue.severity === IssueSeverity.CRITICAL || issue.severity === IssueSeverity.HIGH) ? 1 : 0,
        issues: [issue.id]
      });
    }
  });

  // Sort hotspots by intensity
  hotspots.sort((a, b) => b.count - a.count);

  res.json({
    metrics: {
      total,
      resolved,
      inProgress,
      open,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    },
    departmentPerformance,
    categoryResolutionTimes,
    hotspots: hotspots.slice(0, 5) // top 5 hotspots
  });
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NagrikSetu express server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
