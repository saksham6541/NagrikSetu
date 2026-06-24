/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  MapPin, 
  CheckCircle, 
  Clock, 
  User, 
  Send, 
  Search, 
  Plus, 
  Filter, 
  Shield, 
  TrendingUp, 
  Award, 
  ThumbsUp, 
  MessageSquare, 
  Activity, 
  BookOpen, 
  RefreshCw, 
  Sparkles, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Map, 
  Layers, 
  Flag,
  Globe,
  Menu,
  X,
  Wrench,
  Camera,
  AlertCircle,
  XCircle
} from "lucide-react";
import { 
  Issue, 
  IssueCategory, 
  IssueSeverity, 
  IssueStatus, 
  LocationData, 
  AIAnalysisResult, 
  Comment, 
  LeaderboardUser,
  Worker
} from "./types";
import { 
  ARCHITECTURE_DOC, 
  DATABASE_DOC, 
  API_DOC, 
  AI_ML_DOC, 
  ROADMAP_DOC 
} from "./docsData";

// Preset simulated images for instant reporting testing
const PRESET_IMAGES = [
  {
    name: "Massive Pothole",
    category: IssueCategory.POTHOLE,
    url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
    description: "Deep pothole in the middle of a high-speed lane. Dangerous for bikes."
  },
  {
    name: "Broken Streetlight",
    category: IssueCategory.STREETLIGHT,
    url: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=600&q=80",
    description: "Streetlight is completely dark since last Wednesday. Dark alley."
  },
  {
    name: "Garbage Pile",
    category: IssueCategory.GARBAGE,
    url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
    description: "Commercial plastic waste overflowing near public school gate."
  },
  {
    name: "Burst Water Line",
    category: IssueCategory.WATER_LEAK,
    url: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80",
    description: "Water gushing out of underground pipeline on main arterial road."
  }
];

// Helper functions for Worker Recommendation Engine
const isSkillMatch = (workerSkill: string, category: string): boolean => {
  const wLower = workerSkill.toLowerCase();
  const cLower = category.toLowerCase();
  if (cLower === "pothole" && wLower.includes("road repair")) return true;
  if (cLower === "streetlight" && (wLower.includes("electrician") || wLower.includes("streetlight"))) return true;
  if (cLower === "water_leak" && (wLower.includes("water pipeline") || wLower.includes("water technician") || wLower.includes("plumber"))) return true;
  if (cLower === "sewage" && wLower.includes("plumber")) return true;
  if (cLower === "garbage" && wLower.includes("sanitation")) return true;
  return false;
};

const getWorkerDistance = (worker: Worker, issue: Issue): number => {
  const issueWardLower = (issue.location.ward || "").toLowerCase();
  const issueAddressLower = (issue.location.address || "").toLowerCase();
  const workerWardLower = worker.ward.toLowerCase();
  
  // Extract area name in parentheses, e.g., "koramangala" from "Ward 24 (Koramangala)"
  const workerAreaMatch = workerWardLower.match(/\(([^)]+)\)/);
  const workerArea = workerAreaMatch ? workerAreaMatch[1] : workerWardLower;
  
  if (issueWardLower.includes(workerArea) || issueAddressLower.includes(workerArea)) {
    // Ward/Area overlap: Close distance (0.3 to 1.5 km)
    const seed = (worker.id.charCodeAt(1) || 0) + (issue.id.charCodeAt(issue.id.length - 1) || 0);
    return parseFloat((0.3 + (seed % 10) * 0.12).toFixed(1));
  } else {
    // No match: Farther distance (2.0 to 8.5 km)
    const seed = (worker.id.charCodeAt(1) || 0) + (issue.id.charCodeAt(issue.id.length - 1) || 0);
    return parseFloat((2.0 + (seed % 13) * 0.5).toFixed(1));
  }
};

const calculateMatchScore = (worker: Worker, issue: Issue): { score: number; distance: number; isMatch: boolean } => {
  const isMatch = isSkillMatch(worker.skill, issue.category);
  const distance = getWorkerDistance(worker, issue);
  
  // Base category score
  let score = isMatch ? 60 : 10;
  
  // Rating contribution (up to 20 points for a perfect 5.0 rating)
  score += (worker.rating / 5.0) * 20;
  
  // Completed tasks contribution (up to 10 points, capped at 100 tasks)
  score += Math.min(worker.completedTasks / 100, 1) * 10;
  
  // Distance score (closer gets more points, <=1km gets 10, >=10km gets 0)
  const distanceScore = Math.max(10 - distance, 0);
  score += distanceScore;
  
  return {
    score: Math.round(score),
    distance,
    isMatch
  };
};

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "report" | "leaderboard" | "analytics" | "docs">("dashboard");
  
  // App state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Mobile responsive views
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState<boolean>(false);

  // Simulated Workers definition (10 realistic local skilled workers)
  const mockWorkersList: Worker[] = [
    { id: "W01", name: "Ramesh Kumar", skill: "Road Repair Technician", phone: "+91 98111 22233", ward: "Ward 12 (Indiranagar)", rating: 4.8, completedTasks: 42, availabilityStatus: "AVAILABLE" },
    { id: "W02", name: "Sunil Yadav", skill: "Electrician", phone: "+91 98222 33344", ward: "Ward 24 (Koramangala)", rating: 4.7, completedTasks: 31, availabilityStatus: "AVAILABLE" },
    { id: "W03", name: "Abdul Khan", skill: "Sanitation Worker", phone: "+91 98333 44455", ward: "Ward 35 (Jayanagar)", rating: 4.9, completedTasks: 65, availabilityStatus: "AVAILABLE" },
    { id: "W04", name: "Sanjay Dutt", skill: "Plumber", phone: "+91 98444 55566", ward: "Ward 41 (Malleshwaram)", rating: 4.5, completedTasks: 18, availabilityStatus: "AVAILABLE" },
    { id: "W05", name: "Vikram Singh", skill: "Water Pipeline Technician", phone: "+91 98555 66677", ward: "Ward 10 (Whitefield)", rating: 4.6, completedTasks: 27, availabilityStatus: "BUSY" },
    { id: "W06", name: "Suresh Raina", skill: "Streetlight Technician", phone: "+91 98666 77788", ward: "Ward 22 (HSR Layout)", rating: 4.8, completedTasks: 53, availabilityStatus: "AVAILABLE" },
    { id: "W07", name: "Amit Patel", skill: "Road Repair Technician", phone: "+91 98777 88899", ward: "Ward 15 (BTM Layout)", rating: 4.4, completedTasks: 22, availabilityStatus: "AVAILABLE" },
    { id: "W08", name: "Rajesh G", skill: "Plumber", phone: "+91 98888 99900", ward: "Ward 08 (Hebbal)", rating: 4.6, completedTasks: 15, availabilityStatus: "AVAILABLE" },
    { id: "W09", name: "Lakshmi Prasanna", skill: "Sanitation Worker", phone: "+91 98999 00011", ward: "Ward 19 (Rajajinagar)", rating: 4.9, completedTasks: 84, availabilityStatus: "AVAILABLE" },
    { id: "W10", name: "Nitin Gadkari", skill: "Road Repair Technician", phone: "+91 98111 00022", ward: "Ward 50 (Marathahalli)", rating: 4.9, completedTasks: 95, availabilityStatus: "BUSY" }
  ];
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("W01");

  // Authentication simulation
  const [userPhone, setUserPhone] = useState<string>("+91 98765 43210");
  const [userName, setUserName] = useState<string>("Rajesh Sharma");
  const [userCity, setUserCity] = useState<string>("Bengaluru");
  const [userRole, setUserRole] = useState<"CITIZEN" | "OFFICER" | "WORKER">("CITIZEN");
  const [userPoints, setUserPoints] = useState<number>(340);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [loginInputPhone, setLoginInputPhone] = useState<string>("+91 ");
  const [loginInputName, setLoginInputName] = useState<string>("");

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "priority" | "votes">("priority");
  const [workerFilterSelf, setWorkerFilterSelf] = useState<boolean>(true);

  // Report Form state
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formCategory, setFormCategory] = useState<IssueCategory>(IssueCategory.OTHER);
  const [formSeverity, setFormSeverity] = useState<IssueSeverity>(IssueSeverity.MEDIUM);
  const [formImage, setFormImage] = useState<string>("");
  const [formCity, setFormCity] = useState<string>("Bengaluru");
  const [formAddress, setFormAddress] = useState<string>("");
  const [formLat, setFormLat] = useState<number>(12.9716);
  const [formLng, setFormLng] = useState<number>(77.5946);
  
  // AI draft analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);

  // Comments state
  const [newCommentText, setNewCommentText] = useState<string>("");

  // Worker Evidence states
  const [evidenceNote, setEvidenceNote] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");
  const [evidenceBeforeUrl, setEvidenceBeforeUrl] = useState<string>("");
  const [evidenceAfterUrl, setEvidenceAfterUrl] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectionForm, setShowRejectionForm] = useState<boolean>(false);

  // Worker Dashboard filter state
  const [workerDashboardFilter, setWorkerDashboardFilter] = useState<"ALL" | "ASSIGNED" | "IN_PROGRESS" | "VERIFYING" | "RESOLVED">("ALL");

  // Demo Mode toggle state (Task 4)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Manual worker selected state
  const [selectedManualWorkerId, setSelectedManualWorkerId] = useState<string>("W01");

  // Worker Skill Validation Mismatch state (Task 3)
  const [mismatchPendingWorker, setMismatchPendingWorker] = useState<Worker | null>(null);
  const [mismatchPendingAction, setMismatchPendingAction] = useState<(() => void) | null>(null);

  // Documentation tab active sub-tab
  const [activeDocSubTab, setActiveDocSubTab] = useState<"arch" | "db" | "api" | "ai" | "roadmap">("arch");

  // Custom Toast Notifications
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Override standard window alert for seamless visual overlays in iFrames
  const alert = (message: string) => {
    let type: "success" | "error" | "info" = "info";
    const msgLower = message.toLowerCase();
    if (
      msgLower.includes("success") || 
      msgLower.includes("thank") || 
      msgLower.includes("registered") || 
      msgLower.includes("earned") || 
      msgLower.includes("verified") ||
      msgLower.includes("approved") ||
      msgLower.includes("uploaded") ||
      msgLower.includes("assigned task successfully")
    ) {
      type = "success";
    } else if (
      msgLower.includes("failed") || 
      msgLower.includes("error") || 
      msgLower.includes("invalid") || 
      msgLower.includes("rejected") ||
      msgLower.includes("please enter") ||
      msgLower.includes("please fill")
    ) {
      type = "error";
    }
    triggerToast(message, type);
  };

  // Robust Client-Side Fallback data to prevent blank screen demo breaks
  const loadFallbackState = () => {
    const fallbackList: Issue[] = [
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
        imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
        reporterName: "Rajesh Kumar",
        reporterPhone: "+91 98765 43210",
        upvotes: 42,
        upvotedBy: ["+91 98765 43210"],
        assignedDepartment: "Municipal Road Works Division (BBMP)",
        assignedWorkerId: "W01",
        assignedWorkerName: "Ramesh Kumar",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        verificationRate: 94,
        comments: [
          {
            id: "c1",
            authorName: "Ananya Sharma",
            authorRole: "CITIZEN",
            text: "Yes, I saw a scooter slip here yesterday. Highly critical to get this patched up before monsoon hits full swing!",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        history: [
          {
            status: IssueStatus.OPEN,
            updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            note: "Issue reported by citizen Rajesh Kumar",
            updatedBy: "Rajesh Kumar"
          }
        ]
      },
      {
        id: "issue-2",
        title: "Flickering Streetlight on Outer Ring Road",
        description: "Streetlight number SL-402 has been flickering continuously for three days, making the dark corner unsafe for pedestrians at night.",
        category: IssueCategory.STREETLIGHT,
        severity: IssueSeverity.MEDIUM,
        status: IssueStatus.OPEN,
        location: {
          lat: 12.9716,
          lng: 77.5946,
          address: "Outer Ring Road, near HSR Flyover Corner",
          city: "Bengaluru",
          ward: "Ward 22 (HSR Layout)"
        },
        imageUrl: "https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?auto=format&fit=crop&w=600&q=80",
        reporterName: "Ananya Sharma",
        reporterPhone: "+91 98765 43211",
        upvotes: 18,
        upvotedBy: [],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        verificationRate: 85,
        comments: [],
        history: []
      }
    ];
    setIssues(fallbackList);
    setSelectedIssue(prev => {
      if (prev) {
        const refreshed = fallbackList.find((i: Issue) => i.id === prev.id);
        return refreshed || fallbackList[0];
      }
      return fallbackList[0];
    });
  };

  // Load initial data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const issuesRes = await fetch("/api/issues");
        if (issuesRes.ok) {
          const data = await issuesRes.json();
          setIssues(data);
          // Keep selectedIssue synced with updated list, or default to first
          if (data.length > 0) {
            setSelectedIssue(prev => {
              if (prev) {
                const refreshed = data.find((i: Issue) => i.id === prev.id);
                return refreshed || data[0];
              }
              return data[0];
            });
          }
        } else {
          console.warn("Live API responded with error, loading robust local fallback state.");
          loadFallbackState();
        }
        
        const analyticsRes = await fetch("/api/analytics");
        if (analyticsRes.ok) {
          const aData = await analyticsRes.json();
          setAnalytics(aData);
        }
      } catch (err) {
        console.error("Failed to fetch data from live API, utilizing robust local fallback state.", err);
        loadFallbackState();
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [refreshTrigger]);

  // Handle Login OTP simulation
  const handleSendOtp = () => {
    if (!loginInputPhone.trim() || loginInputPhone.length < 10) {
      alert("Please enter a valid 10-digit Indian phone number.");
      return;
    }
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    if (otpCode !== "123456" && otpCode.trim() !== "") {
      alert("Invalid verification code. Enter '123456' or leave empty to bypass.");
      return;
    }
    setIsLoggedIn(true);
    setUserPhone(loginInputPhone);
    setUserName(loginInputName || "Active Citizen");
    setUserPoints(120); // starting bonus
    alert("Phone OTP Verification Successful! +50 Civic Onboarding Points Credited.");
  };

  // Perform AI draft analysis
  const triggerAiAnalysis = async () => {
    if (!formDesc.trim()) {
      alert("Please enter a description for the AI to analyze.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/ai/analyze-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          image: formImage,
          location: { lat: formLat, lng: formLng }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
        // Pre-fill fields with AI recommendations
        setFormCategory(result.detectedCategory);
        setFormSeverity(result.detectedSeverity);
      } else {
        alert("Failed to analyze draft. Fallback triggered.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Preset quick fill triggers
  const handleQuickPresetFill = (preset: typeof PRESET_IMAGES[0]) => {
    setFormTitle(`Unresolved ${preset.name} reported`);
    setFormDesc(preset.description);
    setFormCategory(preset.category);
    setFormImage(preset.url);
    
    // Choose coordinate based on preset category to disperse pins on virtual map
    if (preset.category === IssueCategory.POTHOLE) {
      setFormLat(12.9348);
      setFormLng(77.6114);
      setFormAddress("80 Feet Road, Koramangala 4th Block, Bengaluru");
    } else if (preset.category === IssueCategory.STREETLIGHT) {
      setFormLat(12.9279);
      setFormLng(77.6271);
      setFormAddress("Sector 3, HSR Layout Main Road, Bengaluru");
    } else if (preset.category === IssueCategory.GARBAGE) {
      setFormLat(12.9562);
      setFormLng(77.6324);
      setFormAddress("Rustam Bagh Layout Lane, near Park Gate, Bengaluru");
    } else {
      setFormLat(12.9142);
      setFormLng(77.6095);
      setFormAddress("24th Main Road, JP Nagar 2nd Phase, Bengaluru");
    }
    setFormCity("Bengaluru");
  };

  // Handle submit issue
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDesc || !formAddress) {
      alert("Please fill in Title, Description, and capture your Location.");
      return;
    }

    try {
      const payload = {
        title: formTitle,
        description: formDesc,
        category: formCategory,
        severity: formSeverity,
        location: {
          lat: formLat,
          lng: formLng,
          address: formAddress,
          city: formCity,
          ward: `Ward ${Math.floor(Math.random() * 150) + 1}`
        },
        imageUrl: formImage || "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80",
        reporterName: userName,
        reporterPhone: userPhone,
        aiAnalysis: analysisResult
      };

      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`Successfully reported issue! +10 Civic Reward Points earned.`);
        setUserPoints(prev => prev + 10);
        // Reset form
        setFormTitle("");
        setFormDesc("");
        setFormImage("");
        setFormAddress("");
        setAnalysisResult(null);
        setActiveTab("dashboard");
        setIsDetailOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert("Failed to submit issue to server.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle upvote/verify
  const handleVote = async (issueId: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userPhone })
      });

      if (res.ok) {
        const updated = await res.json();
        // Update local issue state
        setIssues(prev => prev.map(i => i.id === issueId ? updated : i));
        setSelectedIssue(updated);
        setUserPoints(prev => prev + 5);
        alert("Peer verification registered! You earned +5 trust points.");
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to register vote.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle posting comments
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedIssue) return;

    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: userRole === "WORKER" 
            ? (mockWorkersList.find(w => w.id === selectedWorkerId)?.name || "Municipal Worker")
            : (userRole === "OFFICER" ? `${userName} (Officer)` : userName),
          authorRole: userRole,
          text: newCommentText
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setIssues(prev => prev.map(i => i.id === selectedIssue.id ? updated : i));
        setSelectedIssue(updated);
        setNewCommentText("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle general workflow updates (Officer, Worker, Citizen)
  const handleWorkflowAction = async (payload: {
    status: IssueStatus;
    note: string;
    updatedBy: string;
    assignedWorkerId?: string;
    assignedWorkerName?: string;
    assignedDate?: string;
    beforeEvidenceUrl?: string;
    afterEvidenceUrl?: string;
    completionEvidenceUrl?: string;
    completionEvidenceNote?: string;
    verifiedByCitizen?: boolean;
    severity?: IssueSeverity;
    assignedDepartment?: string;
    completionLat?: number;
    completionLng?: number;
    completionTimestamp?: string;
    reworkCount?: number;
    gpsVerified?: boolean;
  }) => {
    if (!selectedIssue) return;
    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setIssues(prev => prev.map(i => i.id === selectedIssue.id ? updated : i));
        setSelectedIssue(updated);
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert("Workflow update failed.");
      }
    } catch (err) {
      console.error("Workflow update error:", err);
    }
  };

  // Handle authority action (update status/assign department)
  const handleAuthorityAction = async (status: IssueStatus, note: string, dept?: string) => {
    if (!selectedIssue) return;
    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note,
          updatedBy: `${userName} (Dept Head)`,
          assignedDepartment: dept || selectedIssue.assignedDepartment
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setIssues(prev => prev.map(i => i.id === selectedIssue.id ? updated : i));
        setSelectedIssue(updated);
        alert(`Issue status successfully escalated to ${status}.`);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & Sort Logic
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.location.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "ALL" || issue.category === categoryFilter;
    const matchesSeverity = severityFilter === "ALL" || issue.severity === severityFilter;
    const matchesStatus = statusFilter === "ALL" || issue.status === statusFilter;

    let matchesWorker = true;
    let matchesWorkerStatus = true;

    if (userRole === "WORKER") {
      // Workers should only see tasks assigned to them
      matchesWorker = issue.assignedWorkerId === selectedWorkerId;
      
      // Handle worker dashboard filters: All, Assigned, In Progress, Verification Pending, Completed
      if (workerDashboardFilter === "ASSIGNED") {
        matchesWorkerStatus = issue.status === IssueStatus.ASSIGNED;
      } else if (workerDashboardFilter === "IN_PROGRESS") {
        matchesWorkerStatus = issue.status === IssueStatus.IN_PROGRESS;
      } else if (workerDashboardFilter === "VERIFYING") {
        matchesWorkerStatus = issue.status === IssueStatus.VERIFYING;
      } else if (workerDashboardFilter === "RESOLVED") {
        matchesWorkerStatus = issue.status === IssueStatus.RESOLVED;
      }
    }

    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus && matchesWorker && matchesWorkerStatus;
  }).sort((a, b) => {
    if (sortBy === "priority") {
      const scoreA = a.aiAnalysis?.priorityScore || (a.severity === IssueSeverity.CRITICAL ? 90 : a.severity === IssueSeverity.HIGH ? 70 : 40);
      const scoreB = b.aiAnalysis?.priorityScore || (b.severity === IssueSeverity.CRITICAL ? 90 : b.severity === IssueSeverity.HIGH ? 70 : 40);
      return scoreB - scoreA;
    } else if (sortBy === "votes") {
      return b.upvotes - a.upvotes;
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Simulated static top leaderboard entries
  const LEADERBOARD_USERS: LeaderboardUser[] = [
    { rank: 1, name: "Arvind Kejriwal", city: "Delhi-NCR", points: 1450, reportsCount: 42, badges: ["🏆 City Champion", "🛡️ High Trust Reporter"] },
    { rank: 2, name: "Anil Kumble", city: "Bengaluru", points: 1220, reportsCount: 31, badges: ["🔥 Weekly Star", "📍 Ward Custodian"] },
    { rank: 3, name: "Raveena Tandon", city: "Mumbai", points: 980, reportsCount: 24, badges: ["🌸 Active Citizen", "💬 Local Advisor"] },
    { rank: 4, name: "Rajesh Sharma", city: "Bengaluru", points: userPoints, reportsCount: 18, badges: ["📍 Ward Admin", "🎖️ Senior Spotter"] },
    { rank: 5, name: "Priya Bajpai", city: "Lucknow", points: 540, reportsCount: 14, badges: ["🎖️ Fast Reporter"] },
    { rank: 6, name: "Amit Sharma", city: "Delhi-NCR", points: 410, reportsCount: 11, badges: ["🎖️ Fast Reporter"] }
  ];

  return (
    <div id="app-root" className="flex h-screen w-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar Backdrop for Mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed md:relative top-0 bottom-0 left-0 z-50 w-64 bg-[#0F172A] flex flex-col border-r border-slate-200 shrink-0 transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-950">
                NS
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">NagrikSetu</h1>
                <p className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase mt-1">Citizen Portal</p>
              </div>
            </div>
            {/* Close button on mobile */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-slate-400 hover:text-white md:hidden rounded-lg hover:bg-slate-800 transition-colors"
              title="Close Menu"
            >
              <X className="w-5.5 h-5.5" />
            </button>
          </div>

          <nav className="space-y-1.5">
            <button 
              onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                activeTab === "dashboard" 
                  ? "bg-blue-600/10 text-blue-400 border-blue-500/20 font-semibold shadow-inner" 
                  : "text-slate-400 hover:text-white border-transparent hover:bg-slate-800/30"
              }`}
            >
              <Activity className="w-5 h-5 shrink-0" />
              <span className="text-xs tracking-wider uppercase font-medium">Dashboard Feed</span>
            </button>

            <button 
              onClick={() => { setActiveTab("report"); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                activeTab === "report" 
                  ? "bg-blue-600/10 text-blue-400 border-blue-500/20 font-semibold shadow-inner" 
                  : "text-slate-400 hover:text-white border-transparent hover:bg-slate-800/30"
              }`}
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="text-xs tracking-wider uppercase font-medium">Report Issue</span>
            </button>

            {!isDemoMode && (
              <>
                <button 
                  onClick={() => { setActiveTab("leaderboard"); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    activeTab === "leaderboard" 
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/20 font-semibold shadow-inner" 
                      : "text-slate-400 hover:text-white border-transparent hover:bg-slate-800/30"
                  }`}
                >
                  <Award className="w-5 h-5 shrink-0" />
                  <span className="text-xs tracking-wider uppercase font-medium">Leaderboard</span>
                </button>

                <button 
                  onClick={() => { setActiveTab("analytics"); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    activeTab === "analytics" 
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/20 font-semibold shadow-inner" 
                      : "text-slate-400 hover:text-white border-transparent hover:bg-slate-800/30"
                  }`}
                >
                  <TrendingUp className="w-5 h-5 shrink-0" />
                  <span className="text-xs tracking-wider uppercase font-medium">Analytics Portal</span>
                </button>

                <button 
                  onClick={() => { setActiveTab("docs"); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    activeTab === "docs" 
                      ? "bg-blue-600/10 text-blue-400 border-blue-500/20 font-semibold shadow-inner" 
                      : "text-slate-400 hover:text-white border-transparent hover:bg-slate-800/30"
                  }`}
                >
                  <BookOpen className="w-5 h-5 shrink-0" />
                  <span className="text-xs tracking-wider uppercase font-medium">Technical Specs</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Account / Context Info */}
        <div className="mt-auto p-6 border-t border-slate-800 bg-slate-900/40">
          {isLoggedIn ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-slate-900 text-sm shadow">
                  {userName.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate uppercase">{userName}</p>
                  <p className="text-[10px] text-slate-400 truncate tracking-wide">{userPhone}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-medium text-slate-400">
                  <Award className="w-4 h-4 text-amber-500" /> Points:
                </span>
                <span className="font-black text-white text-sm bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                  {userPoints}
                </span>
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-800/60">
                <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Simulator Role Selector</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setUserRole("CITIZEN")}
                    className={`py-1.5 text-[9px] font-black rounded-lg transition-all ${
                      userRole === "CITIZEN"
                        ? "bg-blue-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Citizen
                  </button>
                  <button
                    onClick={() => setUserRole("OFFICER")}
                    className={`py-1.5 text-[9px] font-black rounded-lg transition-all ${
                      userRole === "OFFICER"
                        ? "bg-purple-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Officer
                  </button>
                  <button
                    onClick={() => {
                      setUserRole("WORKER");
                      if (selectedIssue?.assignedWorkerId) {
                        setSelectedWorkerId(selectedIssue.assignedWorkerId);
                      }
                    }}
                    className={`py-1.5 text-[9px] font-black rounded-lg transition-all ${
                      userRole === "WORKER"
                        ? "bg-amber-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Worker
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Demo Mode (Judge View)</span>
                <button
                  onClick={() => setIsDemoMode(!isDemoMode)}
                  className={`text-[9px] font-black px-2.5 py-1 rounded-md transition-all ${
                    isDemoMode 
                      ? "bg-emerald-600 text-white animate-pulse" 
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isDemoMode ? "ON" : "OFF"}
                </button>
              </div>

              {/* Worker Switcher */}
              {userRole === "WORKER" && (
                <div className="space-y-1 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                  <label className="text-[8px] uppercase font-black text-amber-400 tracking-wider block">Select Active Worker</label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full bg-slate-950 text-[10px] text-amber-300 border border-amber-500/30 rounded-lg p-1 focus:outline-none"
                  >
                    {mockWorkersList.map(worker => (
                      <option key={worker.id} value={worker.id} className="bg-slate-950 text-white text-[10px]">
                        {worker.name} ({worker.skill})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] pt-1">
                <button 
                  onClick={() => {
                    setIsLoggedIn(false);
                    setOtpSent(false);
                  }}
                  className="w-full py-1.5 bg-red-950/40 text-red-400 font-bold border border-red-900/30 rounded-lg hover:bg-red-900/50 text-center transition-colors"
                >
                  Logout Simulator
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-200">Simulate OTP Sign-In</p>
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Reporter Name</label>
                <input 
                  type="text" 
                  value={loginInputName}
                  onChange={(e) => setLoginInputName(e.target.value)}
                  placeholder="e.g. Anil Kumble" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Phone Number (India)</label>
                <input 
                  type="text" 
                  value={loginInputPhone} 
                  onChange={(e) => setLoginInputPhone(e.target.value)}
                  placeholder="+91 98765 43210" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {!otpSent ? (
                <button 
                  onClick={handleSendOtp}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all"
                >
                  Send Verification OTP
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="bg-slate-800/80 p-2 rounded text-[10px] text-slate-300 border border-slate-700">
                    OTP Dispatched to {loginInputPhone}. Type <strong className="text-white">123456</strong> below.
                  </div>
                  <input 
                    type="password" 
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white tracking-widest text-center focus:outline-none"
                  />
                  <button 
                    onClick={handleVerifyOtp}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all"
                  >
                    Verify & Onboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            {/* Hamburger Menu Trigger for Mobile */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 md:hidden rounded-lg hover:bg-slate-100 transition-all shrink-0"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm md:text-lg font-bold text-slate-800 truncate">Hyperlocal Resolution Console</h2>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-100 shrink-0">
              Active: {userCity}, India
            </span>
            <span className="text-[11px] text-slate-400 italic hidden md:inline truncate">
              Hindi + English Bilingual Routing Enabled
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
              title="Refresh Platform State"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setActiveTab("report");
                setAnalysisResult(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 uppercase tracking-wide"
            >
              <Plus className="w-4 h-4" /> Report Issue
            </button>
          </div>
        </header>

        {/* Dynamic Inner Tab Router */}
        {activeTab === "dashboard" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Stats Header Bar / Toggle for Mobile */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between lg:hidden shrink-0">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" /> Municipal KPI Dashboard
              </span>
              <button 
                onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm active:bg-slate-100 transition-all"
              >
                {isStatsExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Collapse Stats
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Expand Stats ({issues.length})
                  </>
                )}
              </button>
            </div>

            {/* Stats Summary Panel */}
            <section className={`px-4 md:px-8 py-3.5 md:py-5 grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 bg-slate-50 border-b border-slate-200 shrink-0 transition-all duration-300 ${
              isStatsExpanded ? "grid" : "hidden lg:grid"
            }`}>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1 flex items-center gap-1">✅ Issues Resolved</p>
                <p className="text-xl font-black text-emerald-600">{issues.filter(i => i.status === IssueStatus.RESOLVED).length + 142}</p>
                <p className="text-[9px] text-slate-400 italic">community verified</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-purple-500">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1 flex items-center gap-1">👷 Active Workers</p>
                <p className="text-xl font-black text-purple-600">{mockWorkersList.filter(w => w.availabilityStatus !== "OFFLINE").length}</p>
                <p className="text-[9px] text-slate-400 italic">local skilled register</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1 flex items-center gap-1">💼 Jobs Assigned</p>
                <p className="text-xl font-black text-blue-600">
                  {issues.filter(i => i.assignedWorkerId).length + 38}
                </p>
                <p className="text-[9px] text-slate-400 italic">active deployments</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1 flex items-center gap-1">⭐ Citizen Satisfaction</p>
                <p className="text-xl font-black text-amber-600">96.4%</p>
                <p className="text-[9px] text-slate-400 italic">peer-voted rating</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-500 col-span-2 lg:col-span-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1 flex items-center gap-1">⏱️ Avg Resolution Time</p>
                <p className="text-xl font-black text-indigo-600">1.6 Days</p>
                <p className="text-[9px] text-slate-400 italic">turnaround speed</p>
              </div>
            </section>

            {/* Split Content View: Left Feed, Right Live Map/Analysis Details */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Column: List Feed */}
              <div className={`w-full lg:w-1/2 flex flex-col border-r border-slate-200 bg-white ${isDetailOpen ? "hidden lg:flex" : "flex"}`}>
                
                {/* Filters Header */}
                {userRole === "WORKER" ? (
                  <div className="p-4 border-b border-slate-100 bg-amber-50/20 space-y-2 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                        👷 Worker Task Filters
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded">
                        Active Worker: {mockWorkersList.find(w => w.id === selectedWorkerId)?.name || "Crew"}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {(["ALL", "ASSIGNED", "IN_PROGRESS", "VERIFYING", "RESOLVED"] as const).map(f => {
                        const isActive = workerDashboardFilter === f;
                        const labels: Record<string, string> = {
                          ALL: "All",
                          ASSIGNED: "Assigned",
                          IN_PROGRESS: "In Progress",
                          VERIFYING: "Pending",
                          RESOLVED: "Completed"
                        };
                        const counts = issues.filter(i => 
                          i.assignedWorkerId === selectedWorkerId && 
                          (f === "ALL" || i.status === f)
                        ).length;
                        
                        return (
                          <button
                            key={f}
                            onClick={() => setWorkerDashboardFilter(f)}
                            className={`py-1.5 px-1 rounded-lg text-[9px] font-black uppercase text-center transition-all ${
                              isActive 
                                ? "bg-amber-500 text-slate-950 shadow-sm font-black" 
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-bold"
                            }`}
                          >
                            {labels[f]} ({counts})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search by street name, title or ID..." 
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <select 
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-600 font-medium"
                      >
                        <option value="priority">Priority Score</option>
                        <option value="recent">Most Recent</option>
                        <option value="votes">Upvotes Count</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5" /> Filters:
                      </span>
                      
                      <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-slate-100 border-none rounded-lg py-1 px-2 text-[10px] text-slate-600 font-bold"
                      >
                        <option value="ALL">All Categories</option>
                        {Object.values(IssueCategory).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>

                      <select 
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="bg-slate-100 border-none rounded-lg py-1 px-2 text-[10px] text-slate-600 font-bold"
                      >
                        <option value="ALL">All Severities</option>
                        {Object.values(IssueSeverity).map(sev => (
                          <option key={sev} value={sev}>{sev}</option>
                        ))}
                      </select>

                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-100 border-none rounded-lg py-1 px-2 text-[10px] text-slate-600 font-bold"
                      >
                        <option value="ALL">All Statuses</option>
                        {Object.values(IssueStatus).map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Submissions List Container */}
                <div 
                  className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain scroll-smooth touch-pan-y"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Active Submissions ({filteredIssues.length})
                    </h3>
                    <div className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black uppercase border border-indigo-100">
                      <Sparkles className="w-3 h-3" /> Auto-Categorized
                    </div>
                  </div>

                  {filteredIssues.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">No reported issues match this query.</p>
                      <p className="text-[11px] text-slate-500 mt-1">Change your filters or create a new issue to populate the console.</p>
                    </div>
                  ) : (
                    filteredIssues.map(issue => {
                      const isSelected = selectedIssue?.id === issue.id;
                      const priorityScore = issue.aiAnalysis?.priorityScore || 50;

                      return (
                        <div 
                          key={issue.id}
                          onClick={() => { setSelectedIssue(issue); setIsDetailOpen(true); }}
                          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                            isSelected 
                              ? "bg-white border-2 border-blue-500 shadow-md ring-4 ring-blue-500/5" 
                              : "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                          }`}
                        >
                          {/* Priority Score circular badge on card right corner */}
                          <div className="absolute top-4 right-4 flex flex-col items-end">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-400 uppercase font-black">Score</span>
                              <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                                priorityScore >= 80 ? "bg-red-50 text-red-600" : priorityScore >= 60 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                              }`}>
                                {priorityScore}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                            {/* Severity Tag */}
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                              issue.severity === IssueSeverity.CRITICAL 
                                ? "bg-red-100 text-red-700" 
                                : issue.severity === IssueSeverity.HIGH 
                                ? "bg-orange-100 text-orange-700" 
                                : issue.severity === IssueSeverity.MEDIUM 
                                ? "bg-amber-100 text-amber-700" 
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {issue.severity}
                            </span>

                            {/* Status Tag */}
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                              issue.status === IssueStatus.RESOLVED 
                                ? "bg-emerald-100 text-emerald-800" 
                                : issue.status === IssueStatus.IN_PROGRESS 
                                ? "bg-blue-100 text-blue-800" 
                                : issue.status === IssueStatus.ASSIGNED 
                                ? "bg-purple-100 text-purple-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {issue.status}
                            </span>

                            {/* Category Tag */}
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {issue.category}
                            </span>

                            {issue.reworkCount !== undefined && issue.reworkCount >= 2 && (
                              <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider animate-pulse font-sans">
                                🚨 Officer Review Required
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-sm text-slate-900 pr-14 mb-1 line-clamp-1">{issue.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mb-3.5">{issue.description}</p>
                          
                          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
                            <span className="flex items-center gap-1 max-w-[60%] truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{issue.location.address}</span>
                            </span>
                            
                            <div className="flex items-center gap-3 font-semibold text-slate-500">
                              <span className="flex items-center gap-1 text-slate-700">
                                <ThumbsUp className="w-3.5 h-3.5 text-blue-500" /> {issue.upvotes}
                              </span>
                              <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Detailed Analytics & Virtual Map Representation */}
              <div 
                className={`w-full lg:w-1/2 flex flex-col bg-slate-50 p-4 md:p-6 overflow-y-auto space-y-6 overscroll-contain scroll-smooth touch-pan-y ${isDetailOpen ? "flex" : "hidden lg:flex"}`}
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                
                {/* Mobile Back/Collapse button */}
                <div className="lg:hidden shrink-0">
                  <button 
                    onClick={() => setIsDetailOpen(false)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all w-full justify-center"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180 text-blue-600" /> Collapse Details & Back to Feed
                  </button>
                </div>
                
                {/* Map Section */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative h-[300px] shrink-0">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Map className="w-4 h-4 text-blue-600" /> Interactive Community Ward Map
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase border border-emerald-100">
                      Live GPS Sync
                    </span>
                  </div>

                  {/* Mock Map Canvas */}
                  <div className="flex-1 bg-[#E2E8F0] relative overflow-hidden" style={{ minHeight: "200px" }}>
                    <div 
                      className="absolute inset-0 opacity-40" 
                      style={{ 
                        backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px), radial-gradient(#94a3b8 1px, transparent 1px)", 
                        backgroundSize: "20px 20px",
                        backgroundPosition: "0 0, 10px 10px"
                      }}
                    />
                    
                    {/* Simulated Map Streets */}
                    <div className="absolute top-1/3 left-0 w-full h-2 bg-slate-300 transform -rotate-6" />
                    <div className="absolute top-2/3 left-0 w-full h-2 bg-slate-300 transform rotate-12" />
                    <div className="absolute top-0 left-1/4 w-2 h-full bg-slate-300 transform -rotate-12" />
                    <div className="absolute top-0 left-2/3 w-2 h-full bg-slate-300 transform rotate-6" />

                    {/* Ward Target Highlight Area */}
                    <div className="absolute top-1/4 left-1/2 w-48 h-32 bg-blue-500/10 rounded-full border-2 border-blue-500/20 flex items-center justify-center animate-pulse">
                      <span className="text-[9px] text-blue-500/60 font-black tracking-wider uppercase">Active Ward Perimeter</span>
                    </div>

                    {/* Draw Pins for each active issue */}
                    {filteredIssues.map((issue, idx) => {
                      // Map GPS coordinates into coordinate percentage distribution
                      const latNorm = (issue.location.lat - 12.9) * 2000; 
                      const lngNorm = (issue.location.lng - 77.6) * 2000;
                      
                      const topPct = Math.max(15, Math.min(85, 50 - (latNorm || idx * 12)));
                      const leftPct = Math.max(15, Math.min(85, 50 + (lngNorm || idx * 15)));

                      const isSelected = selectedIssue?.id === issue.id;

                      return (
                        <div 
                          key={issue.id}
                          onClick={() => { setSelectedIssue(issue); setIsDetailOpen(true); }}
                          className="absolute cursor-pointer transition-all hover:scale-125 z-20 group"
                          style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                            isSelected 
                              ? "bg-blue-600 scale-125 ring-4 ring-blue-200" 
                              : issue.severity === IssueSeverity.CRITICAL 
                              ? "bg-red-500 hover:bg-red-600 text-white" 
                              : issue.severity === IssueSeverity.HIGH 
                              ? "bg-orange-500 hover:bg-orange-600 text-white" 
                              : "bg-blue-500 hover:bg-blue-600 text-white"
                          }`}>
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded shadow-xl whitespace-nowrap z-50">
                            {issue.title} ({issue.category})
                          </div>
                        </div>
                      );
                    })}

                    {/* Selected issue detail tooltip overlay inside map */}
                    {selectedIssue && (
                      <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm p-3.5 rounded-xl border border-slate-200 shadow-xl flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-blue-600 uppercase">Selected Coordinate Profile</p>
                          <p className="text-xs font-bold text-slate-800 truncate">{selectedIssue.location.address}</p>
                          <p className="text-[10px] text-slate-500 truncate">GPS Lat/Lng: {selectedIssue.location.lat.toFixed(4)}, {selectedIssue.location.lng.toFixed(4)}</p>
                        </div>
                        <button 
                          onClick={() => handleVote(selectedIssue.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg shrink-0 flex items-center gap-1 shadow"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Peer Verify ({selectedIssue.upvotes})
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Issue Detail Analysis Card */}
                {selectedIssue ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col p-6 space-y-6">
                    
                    {/* Header Row */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                            ID: #{selectedIssue.id}
                          </span>
                          <span className="text-xs text-slate-400">
                            Reported {new Date(selectedIssue.createdAt).toLocaleDateString()} by {selectedIssue.reporterName}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">{selectedIssue.title}</h3>
                      </div>

                      {selectedIssue.reworkCount !== undefined && selectedIssue.reworkCount >= 2 && (
                        <div className="col-span-full w-full bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex flex-col gap-1 shadow-sm font-sans animate-pulse">
                          <div className="flex items-center gap-1.5 text-xs font-black uppercase text-rose-950">
                            <span>🚨 Officer Review Required</span>
                            <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-auto font-black font-sans">
                              Rework Limit Exceeded ({selectedIssue.reworkCount})
                            </span>
                          </div>
                          <p className="text-xs text-rose-700 font-medium">
                            This civic grievance has failed resident validation multiple times and has been escalated. An officer must review the history trail, assign an appropriate specialist, or contact the supervisor.
                          </p>
                        </div>
                      )}
                      
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-black uppercase block mb-1">Peer Consensus</span>
                        <div className="bg-slate-100 text-slate-800 text-xs font-black px-2.5 py-1 rounded-md border border-slate-200">
                          {selectedIssue.verificationRate}% Agreement
                        </div>
                      </div>
                    </div>

                    {/* Image Representation if present */}
                    {selectedIssue.imageUrl && (
                      <div className="h-44 w-full rounded-xl overflow-hidden border border-slate-200 relative bg-slate-50">
                        <img 
                          src={selectedIssue.imageUrl} 
                          alt="Civic issue photograph" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80";
                          }}
                        />
                        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 uppercase">
                          Source Evidence
                        </div>
                      </div>
                    )}

                    {/* Completion Evidence if present */}
                    {(selectedIssue.completionEvidenceUrl || selectedIssue.afterEvidenceUrl) && (
                      <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                            <CheckCircle className="w-4 h-4 text-emerald-600" /> Worker Completion Evidence
                          </span>
                          {selectedIssue.completionLat && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 border border-blue-200 animate-pulse font-sans">
                              📍 GPS Verified Badge
                            </span>
                          )}
                        </div>
                        
                        {/* Before vs After Photos Side by Side Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">Before Work</span>
                            <div className="h-28 w-full rounded-lg overflow-hidden border border-slate-200 relative bg-slate-100">
                              <img 
                                src={selectedIssue.beforeEvidenceUrl || selectedIssue.imageUrl || "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80"} 
                                alt="Before repair" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80";
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">After Resolved</span>
                            <div className="h-28 w-full rounded-lg overflow-hidden border-emerald-200 border relative bg-slate-100">
                              <img 
                                src={selectedIssue.afterEvidenceUrl || selectedIssue.completionEvidenceUrl || "https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?auto=format&fit=crop&w=600&q=80"} 
                                alt="After repair" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?auto=format&fit=crop&w=600&q=80";
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-1 bg-white p-3 rounded-lg border border-emerald-100 font-sans">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Worker Report Note</span>
                          <p className="text-xs text-slate-700 italic font-medium">
                            "{selectedIssue.completionEvidenceNote || "Repairs successfully completed on-site."}"
                          </p>
                          
                          {/* GPS Proof of Work Info */}
                          {(selectedIssue.completionLat || selectedIssue.completionTimestamp) && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono">
                              {selectedIssue.completionLat && selectedIssue.completionLng && (
                                <div>
                                  <span className="text-[8px] uppercase font-bold text-slate-400 block font-sans tracking-wide">🛰️ Repair Location (GPS)</span>
                                  <span className="font-semibold text-slate-700">Lat: {selectedIssue.completionLat}, Lng: {selectedIssue.completionLng}</span>
                                </div>
                              )}
                              {selectedIssue.completionTimestamp && (
                                <div>
                                  <span className="text-[8px] uppercase font-bold text-slate-400 block font-sans tracking-wide">⏱️ Repair Time (Audit)</span>
                                  <span className="font-semibold text-emerald-700">{selectedIssue.completionTimestamp}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedIssue.verifiedByCitizen && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-[10px] text-emerald-700 font-black font-sans uppercase tracking-wider bg-emerald-50 py-1.5 px-2 rounded border border-emerald-200">
                              <span>✅ Citizen Verified & Closed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Description Block */}
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Unstructured Description</h5>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                        "{selectedIssue.description}"
                      </p>
                    </div>

                    {/* AI Analysis Multimodal Insights Block */}
                    {selectedIssue.aiAnalysis && (
                      <div className="bg-indigo-50/50 rounded-2xl p-4.5 border border-indigo-100 space-y-4">
                        <div className="flex justify-between items-center border-b border-indigo-100/50 pb-2.5">
                          <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                            <Sparkles className="w-4 h-4 text-indigo-600" /> AI Multimodal Vision Analysis
                          </span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold uppercase">
                            Accuracy Conf: {Math.round((selectedIssue.aiAnalysis.confidenceScore || 0.95) * 100)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Automated Route</span>
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-indigo-600" /> {selectedIssue.aiAnalysis.departmentRouting}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Priority Severity Level</span>
                            <span className="font-bold text-slate-800 uppercase flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> {selectedIssue.aiAnalysis.detectedSeverity} (Score: {selectedIssue.aiAnalysis.priorityScore}/100)
                            </span>
                          </div>
                        </div>

                        {/* Summary English Translation and Local Hindi Translation summaries */}
                        <div className="space-y-2.5 border-t border-indigo-100/50 pt-3">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-blue-500" /> English Municipal Draft Brief
                            </span>
                            <p className="text-xs text-slate-700 font-medium">
                              {selectedIssue.aiAnalysis.summaryDraftEn}
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-orange-500" /> formal Hindi Draft Brief (bilingual)
                            </span>
                            <p className="text-xs text-slate-800 font-semibold tracking-wide">
                              {selectedIssue.aiAnalysis.summaryDraftHi}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* History Tracking logs */}
                    <div className="space-y-2.5">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status SLA Resolution History</h5>
                      <div className="space-y-2.5 border-l-2 border-slate-200 pl-4 py-1">
                        {selectedIssue.history.map((log, lIdx) => (
                          <div key={lIdx} className="text-xs relative">
                            {/* Dot indicator on vertical line */}
                            <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-slate-400 border border-white" />
                            <div className="flex justify-between font-bold text-slate-800">
                              <span>{log.status}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{new Date(log.updatedAt).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-500 text-[11px] mt-0.5">{log.note} &bull; <span className="italic">by {log.updatedBy}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unified Multi-Role Municipal Workspace */}
                    {userRole === "OFFICER" && (
                      <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                          <span className="text-xs font-black text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-purple-700 animate-pulse" /> ⚡ Officer Administration Desk
                          </span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                            ID: {selectedIssue.id}
                          </span>
                        </div>

                        {/* Current Assignment Status */}
                        <div className="bg-white p-3 rounded-lg border border-purple-100 text-xs space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">Assigned Worker</span>
                            <span className="font-bold text-purple-900">
                              {selectedIssue.assignedWorkerName ? (
                                <span className="flex items-center gap-1">
                                  👷 {selectedIssue.assignedWorkerName} ({selectedIssue.assignedWorkerId})
                                </span>
                              ) : (
                                "❌ Unassigned"
                              )}
                            </span>
                          </div>
                          {selectedIssue.assignedDepartment && (
                            <div className="flex justify-between items-center border-t border-slate-50 pt-1.5">
                              <span className="text-slate-400 text-[10px] uppercase font-bold">Department / Skill</span>
                              <span className="font-semibold text-slate-700">{selectedIssue.assignedDepartment}</span>
                            </div>
                          )}
                          {selectedIssue.assignedDate && (
                            <div className="flex justify-between items-center border-t border-slate-50 pt-1.5">
                              <span className="text-slate-400 text-[10px] uppercase font-bold">Assigned Date</span>
                              <span className="font-semibold text-slate-700">{selectedIssue.assignedDate}</span>
                            </div>
                          )}
                        </div>

                        {/* Phase 2: AI Skill Recommendation Engine */}
                        <div className="bg-white p-3 rounded-lg border border-purple-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-purple-900 font-extrabold uppercase flex items-center gap-1.5">
                              💡 AI-Driven Smart Recommendation Engine
                            </span>
                            <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                              Top 3 Ranked Specialists
                            </span>
                          </div>
                          
                          <div className="space-y-2.5">
                            {(() => {
                              // Calculate match profiles for all workers
                              const workerProfiles = mockWorkersList.map(worker => {
                                const { score, distance, isMatch } = calculateMatchScore(worker, selectedIssue);
                                return {
                                  worker,
                                  score,
                                  distance,
                                  isMatch
                                };
                              });

                              // Sort by score descending and take top 3
                              const recommended = [...workerProfiles]
                                .sort((a, b) => b.score - a.score)
                                .slice(0, 3);

                              return recommended.map(({ worker, score, distance, isMatch }) => {
                                const isAssigned = selectedIssue.assignedWorkerId === worker.id;
                                
                                return (
                                  <div key={worker.id} className="relative flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:bg-purple-50/40 transition-all hover:shadow-xs group">
                                    {/* Match Score Badge in corner */}
                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                        isMatch 
                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                          : "bg-amber-100 text-amber-800 border border-amber-200"
                                      }`}>
                                        {score}% Match
                                      </span>
                                    </div>

                                    <div className="min-w-0 pr-16">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-black text-slate-800">{worker.name}</span>
                                        {isMatch && (
                                          <span className="text-[8px] bg-emerald-500 text-white font-black px-1 rounded uppercase tracking-wide">
                                            Expert Skill
                                          </span>
                                        )}
                                      </div>
                                      
                                      <p className="text-[10px] text-purple-900 font-bold mt-0.5">
                                        {worker.skill}
                                      </p>
                                      
                                      <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500 font-sans flex-wrap">
                                        <span className="bg-slate-200/60 px-1 py-0.5 rounded font-mono font-bold">
                                          ⭐ {worker.rating.toFixed(1)}
                                        </span>
                                        <span className="bg-slate-200/60 px-1 py-0.5 rounded font-mono font-bold">
                                          💼 {worker.completedTasks} jobs
                                        </span>
                                        <span className="bg-purple-100/70 text-purple-800 px-1 py-0.5 rounded font-mono font-bold">
                                          📍 {distance} km away
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end justify-center">
                                      <button
                                        onClick={() => {
                                          const action = () => {
                                            handleWorkflowAction({
                                              status: IssueStatus.ASSIGNED,
                                              note: `Assigned task to highly recommended specialist ${worker.name} (${worker.skill}) with a calculated AI match rating of ${score}%.`,
                                              updatedBy: `${userName} (Municipal Officer)`,
                                              assignedWorkerId: worker.id,
                                              assignedWorkerName: worker.name,
                                              assignedDepartment: worker.skill,
                                              assignedDate: new Date().toLocaleDateString("en-IN")
                                            });
                                            alert(`Assigned task successfully to recommended worker: ${worker.name}\nMatch Confidence: ${score}% (${distance} km away)`);
                                          };

                                          if (!isMatch) {
                                            setMismatchPendingWorker(worker);
                                            setMismatchPendingAction(() => action);
                                          } else {
                                            action();
                                          }
                                        }}
                                        disabled={isAssigned}
                                        className={`text-[9px] font-black py-1.5 px-3 rounded-lg shadow-sm transition-all uppercase tracking-wider cursor-pointer ${
                                          isAssigned
                                            ? "bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300"
                                            : "bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 active:scale-95"
                                        }`}
                                      >
                                        {isAssigned ? "Assigned" : "Assign Direct"}
                                      </button>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Assign Worker Action */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 uppercase font-bold block">Assign Field Worker (Manual)</label>
                          <div className="flex gap-2">
                            <select
                              id="officer-worker-assign"
                              className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                              value={selectedManualWorkerId}
                              onChange={(e) => {
                                setSelectedManualWorkerId(e.target.value);
                              }}
                            >
                              {mockWorkersList.map(worker => (
                                <option key={worker.id} value={worker.id}>
                                  {worker.name} ({worker.skill})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const wObj = mockWorkersList.find(w => w.id === selectedManualWorkerId);
                                if (wObj) {
                                  const assignAction = () => {
                                    handleWorkflowAction({
                                      status: IssueStatus.ASSIGNED,
                                      note: `Assigned task manually to ${wObj.name} (${wObj.skill})`,
                                      updatedBy: `${userName} (Municipal Officer)`,
                                      assignedWorkerId: wObj.id,
                                      assignedWorkerName: wObj.name,
                                      assignedDepartment: wObj.skill,
                                      assignedDate: new Date().toLocaleDateString("en-IN")
                                    });
                                    alert(`Successfully assigned manually to ${wObj.name}.`);
                                  };

                                  const isMatch = isSkillMatch(wObj.skill, selectedIssue.category);
                                  if (!isMatch) {
                                    setMismatchPendingWorker(wObj);
                                    setMismatchPendingAction(() => assignAction);
                                  } else {
                                    assignAction();
                                  }
                                }
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-sm cursor-pointer"
                            >
                              Assign
                            </button>
                          </div>
                        </div>

                        {/* Phase 1: Worker Directory / Registry */}
                        <div className="bg-white p-3 rounded-lg border border-purple-100 space-y-2">
                          <div className="flex items-center justify-between border-b border-purple-50 pb-1">
                            <span className="text-[10px] text-purple-950 font-black uppercase tracking-wider flex items-center gap-1">
                              📋 Registered Workers Directory
                            </span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              {mockWorkersList.length} Online
                            </span>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {mockWorkersList.map(worker => (
                              <div key={worker.id} className="text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-800">{worker.name}</span>
                                    <span className={`text-[8px] font-bold px-1 rounded uppercase ${
                                      worker.availabilityStatus === "AVAILABLE"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-red-100 text-red-800"
                                    }`}>
                                      {worker.availabilityStatus}
                                    </span>
                                  </div>
                                  <p className="text-slate-500 font-medium truncate">
                                    {worker.skill} &bull; Ward: {worker.ward} &bull; 📞 {worker.phone}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-extrabold text-slate-700">⭐ {worker.rating.toFixed(1)}</p>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase">{worker.completedTasks} Jobs</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Adjust Severity / Priority */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 uppercase font-bold block">Adjust Issue Urgency Priority</label>
                          <div className="grid grid-cols-4 gap-1">
                            {Object.values(IssueSeverity).map(sev => (
                              <button
                                key={sev}
                                onClick={() => {
                                  handleWorkflowAction({
                                    status: selectedIssue.status,
                                    note: `Escalation level adjusted to ${sev}.`,
                                    updatedBy: `${userName} (Officer)`,
                                    severity: sev
                                  });
                                  alert(`Issue urgency updated to ${sev}.`);
                                }}
                                className={`py-1 text-[9px] font-black rounded-md border text-center uppercase transition-colors ${
                                  selectedIssue.severity === sev
                                    ? "bg-red-600 text-white border-red-700 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {sev}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Fast Status Escalation Controls */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 uppercase font-bold block">Direct Work Stage Controls</label>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                handleWorkflowAction({
                                  status: IssueStatus.IN_PROGRESS,
                                  note: "Municipal works division ordered immediate start.",
                                  updatedBy: `${userName} (Officer)`
                                });
                                alert("Work status escalated to IN PROGRESS.");
                              }}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition-colors"
                            >
                              🔧 Force Start
                            </button>
                            <button
                              onClick={() => {
                                handleWorkflowAction({
                                  status: IssueStatus.RESOLVED,
                                  note: "Officer bypass: Repairs marked successfully resolved and quality certified.",
                                  updatedBy: `${userName} (Officer)`
                                });
                                alert("Work certified as RESOLVED.");
                              }}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition-colors"
                            >
                              ✅ Bypass Resolve
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {userRole === "WORKER" && (
                      <div className="bg-amber-50/70 p-5 rounded-xl border border-amber-200 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                          <span className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                            <Wrench className="w-4 h-4 text-amber-600 animate-pulse" /> 👷 Worker Task Desk
                          </span>
                          <span className="text-[9px] bg-amber-500 text-slate-900 font-extrabold px-2 py-0.5 rounded-full uppercase">
                            Active Session
                          </span>
                        </div>

                        {selectedIssue.assignedWorkerId === selectedWorkerId ? (
                          <div className="space-y-4">
                            {/* Worker Bio bar */}
                            <div className="bg-white p-2.5 rounded-lg border border-amber-100 flex items-center justify-between text-xs">
                              <span className="text-slate-400 text-[10px] uppercase font-bold">Assigned Crew</span>
                              <span className="font-bold text-amber-800">
                                {mockWorkersList.find(w => w.id === selectedWorkerId)?.name || "You"}
                              </span>
                            </div>

                            {/* Task States */}
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-500 uppercase font-bold block">Action Options</span>
                              
                              <div className="flex gap-2">
                                {selectedIssue.status !== IssueStatus.IN_PROGRESS && selectedIssue.status !== IssueStatus.RESOLVED && selectedIssue.status !== IssueStatus.VERIFYING && (
                                  <button
                                    onClick={() => {
                                      handleWorkflowAction({
                                        status: IssueStatus.IN_PROGRESS,
                                        note: "Field maintenance worker arrived on site and started repairs.",
                                        updatedBy: `${mockWorkersList.find(w => w.id === selectedWorkerId)?.name} (Worker)`
                                      });
                                      alert("Repairs started. marked as IN PROGRESS.");
                                    }}
                                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black py-2 px-4 rounded-lg shadow-sm transition-colors"
                                  >
                                    🚀 Start Repairs
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Submit Completion Report */}
                            <div className="bg-white p-3.5 rounded-lg border border-amber-200/60 space-y-3">
                              <span className="text-[10px] text-amber-900 uppercase font-black tracking-wide block">
                                📸 Submit Completion Evidence & Report
                              </span>

                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase block">Repairs Report Comment</label>
                                <textarea
                                  value={evidenceNote}
                                  onChange={(e) => setEvidenceNote(e.target.value)}
                                  placeholder="Describe the physical fix (e.g. patched with rapid-setting asphalt mix, checked for water leak seal...)"
                                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-slate-50"
                                  rows={2}
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase block">1. BEFORE WORK Photo URL</label>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={evidenceBeforeUrl}
                                    onChange={(e) => setEvidenceBeforeUrl(e.target.value)}
                                    placeholder="Paste before photo URL..."
                                    className="flex-1 text-[10px] p-1.5 border border-slate-200 rounded-lg bg-slate-50"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-1 pt-1">
                                  <button
                                    onClick={() => setEvidenceBeforeUrl("https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80")}
                                    className="text-[8px] bg-slate-100 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 p-1 rounded font-bold text-slate-600 hover:text-amber-800 transition-colors cursor-pointer"
                                  >
                                    🛣️ Bad Pothole
                                  </button>
                                  <button
                                    onClick={() => setEvidenceBeforeUrl("https://images.unsplash.com/photo-1485083269755-a7b559a4fe5e?auto=format&fit=crop&w=600&q=80")}
                                    className="text-[8px] bg-slate-100 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 p-1 rounded font-bold text-slate-600 hover:text-amber-800 transition-colors cursor-pointer"
                                  >
                                    💡 Broken LED
                                  </button>
                                  <button
                                    onClick={() => setEvidenceBeforeUrl("https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=600&q=80")}
                                    className="text-[8px] bg-slate-100 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 p-1 rounded font-bold text-slate-600 hover:text-amber-800 transition-colors cursor-pointer"
                                  >
                                    🧹 Trash Pile
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase block">2. AFTER WORK Photo URL</label>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={evidenceAfterUrl}
                                    onChange={(e) => setEvidenceAfterUrl(e.target.value)}
                                    placeholder="Paste after photo URL..."
                                    className="flex-1 text-[10px] p-1.5 border border-slate-200 rounded-lg bg-slate-50"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-1 pt-1">
                                  <button
                                    onClick={() => setEvidenceAfterUrl("https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80")}
                                    className="text-[8px] bg-slate-100 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 p-1 rounded font-bold text-slate-600 hover:text-amber-800 transition-colors cursor-pointer"
                                  >
                                    🛣️ Smooth Road
                                  </button>
                                  <button
                                    onClick={() => setEvidenceAfterUrl("https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?auto=format&fit=crop&w=600&q=80")}
                                    className="text-[8px] bg-slate-100 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 p-1 rounded font-bold text-slate-600 hover:text-amber-800 transition-colors cursor-pointer"
                                  >
                                    💡 Glowing LED
                                  </button>
                                  <button
                                    onClick={() => setEvidenceAfterUrl("https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80")}
                                    className="text-[8px] bg-slate-100 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 p-1 rounded font-bold text-slate-600 hover:text-amber-800 transition-colors cursor-pointer"
                                  >
                                    🧹 Clean Area
                                  </button>
                                </div>
                              </div>

                              <button
                                onClick={async () => {
                                  if (!evidenceNote.trim()) {
                                    alert("ValidationError: Completion note/report is required to submit evidence.");
                                    return;
                                  }
                                  if (!evidenceAfterUrl.trim()) {
                                    alert("ValidationError: After repair photo URL is required to submit evidence.");
                                    return;
                                  }

                                  const workerObj = mockWorkersList.find(w => w.id === selectedWorkerId);
                                  const finalBefore = evidenceBeforeUrl || "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80";
                                  const finalAfter = evidenceAfterUrl;
                                  const finalNote = evidenceNote;
                                  
                                  // Capture GPS Proof of Work
                                  let finalLat = selectedIssue.location.lat;
                                  let finalLng = selectedIssue.location.lng;
                                  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " (IST)";
                                  let gpsVerified = true;
                                  
                                  if (navigator.geolocation) {
                                    try {
                                      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500 });
                                      });
                                      finalLat = Number(pos.coords.latitude.toFixed(6));
                                      finalLng = Number(pos.coords.longitude.toFixed(6));
                                    } catch (err) {
                                      console.warn("Geolocation permission or timeout, falling back with jitter:", err);
                                      gpsVerified = false;
                                      alert("Location unavailable");
                                      // Jitter by a tiny distance to simulate a real GPS lock at the reported site
                                      finalLat = Number((selectedIssue.location.lat + (Math.random() - 0.5) * 0.00015).toFixed(6));
                                      finalLng = Number((selectedIssue.location.lng + (Math.random() - 0.5) * 0.00015).toFixed(6));
                                    }
                                  } else {
                                    gpsVerified = false;
                                    alert("Location unavailable");
                                    finalLat = Number((selectedIssue.location.lat + (Math.random() - 0.5) * 0.00015).toFixed(6));
                                    finalLng = Number((selectedIssue.location.lng + (Math.random() - 0.5) * 0.00015).toFixed(6));
                                  }

                                  handleWorkflowAction({
                                    status: IssueStatus.VERIFYING,
                                    note: `Worker submitted completion evidence. Pending resident audit review.`,
                                    updatedBy: `${workerObj?.name || "Worker"}`,
                                    beforeEvidenceUrl: finalBefore,
                                    afterEvidenceUrl: finalAfter,
                                    completionEvidenceUrl: finalAfter, // backwards compatibility
                                    completionEvidenceNote: finalNote,
                                    completionLat: finalLat,
                                    completionLng: finalLng,
                                    completionTimestamp: timestamp,
                                    gpsVerified
                                  });
                                  
                                  setEvidenceNote("");
                                  setEvidenceBeforeUrl("");
                                  setEvidenceAfterUrl("");
                                  alert(`Completion evidence uploaded!\n📍 Location Status: ${gpsVerified ? "GPS Lock Verified" : "Location unavailable (Fallback)"}\n⏱️ Time: ${timestamp}\n\nTicket forwarded to residents for audit.`);
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-2 rounded-lg shadow-sm transition-colors uppercase block text-center cursor-pointer"
                              >
                                Submit Complete Evidence
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100 border border-slate-200 text-slate-500 text-xs p-3.5 rounded-lg space-y-2">
                            <p className="font-semibold flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-slate-400" /> Task Assigned to:
                            </p>
                            <p className="font-bold text-slate-800">
                              {selectedIssue.assignedWorkerName ? (
                                `👷 ${selectedIssue.assignedWorkerName} (${selectedIssue.assignedWorkerId})`
                              ) : (
                                "❌ Unassigned (Requires officer to delegate)"
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 italic pt-1.5 border-t border-slate-200">
                              💡 Simulate this worker by switching "Select Active Worker" to "{selectedIssue.assignedWorkerName || "any crew"}" in the bottom sidebar!
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {userRole === "CITIZEN" && (
                      <div className="space-y-4">
                        {(selectedIssue.status === IssueStatus.RESOLVED || selectedIssue.status === IssueStatus.VERIFYING) && (
                          <div className="bg-blue-50/80 p-5 rounded-xl border border-blue-100 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                              <span className="text-xs font-black text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-blue-600 animate-pulse" /> 🔍 Civic Resolution Audit
                              </span>
                              <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded uppercase">
                                Citizen Vote
                              </span>
                            </div>

                            {!selectedIssue.verifiedByCitizen ? (
                              <div className="space-y-3 text-xs text-slate-700 font-sans">
                                <p className="font-semibold leading-relaxed">
                                  Our field crew has reported this issue fixed. As a local resident, please peer-verify this repair:
                                </p>
                                
                                {!showRejectionForm ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        handleWorkflowAction({
                                          status: IssueStatus.RESOLVED,
                                          note: `Citizen reporter verified that repairs were successfully completed and the site is clear.`,
                                          updatedBy: `${userName} (Resident Auditor)`,
                                          verifiedByCitizen: true
                                        });
                                        setUserPoints(prev => prev + 15); // +15 reputation points
                                        alert("Success! You verified this civic resolution.\n✨ +15 Citizen Reputation points awarded to you.\n👷 +20 Skill reputation points awarded to the assigned worker!");
                                      }}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-2 px-3 rounded-lg shadow-sm transition-colors uppercase cursor-pointer text-center"
                                    >
                                      👍 Approve & Close
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowRejectionForm(true);
                                      }}
                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black py-2 px-3 rounded-lg shadow-sm transition-colors uppercase cursor-pointer text-center"
                                    >
                                      👎 Reject (Rework)
                                    </button>
                                  </div>
                                ) : (
                                  <div className="bg-white p-3 rounded-lg border border-red-200 space-y-2.5">
                                    <label className="text-[9px] text-red-700 font-black uppercase tracking-wide block">
                                      ⚠️ Specify Rework / Rejection Reason (Required)
                                    </label>
                                    <textarea
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      placeholder="Explain what is missing or incorrect (e.g., asphalt patch has loose gravel, streetlight still flickering...)"
                                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500 bg-slate-50 font-sans"
                                      rows={2}
                                    />
                                    <div className="flex gap-1.5 justify-end">
                                      <button
                                        onClick={() => {
                                          setShowRejectionForm(false);
                                          setRejectionReason("");
                                        }}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold py-1 px-2.5 rounded transition-colors cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (!rejectionReason.trim()) {
                                            alert("Please enter a rework reason note before submitting.");
                                            return;
                                          }
                                          const currentReworkCount = (selectedIssue.reworkCount || 0) + 1;
                                          const isEscalated = currentReworkCount >= 2;

                                          handleWorkflowAction({
                                            status: IssueStatus.ASSIGNED,
                                            note: isEscalated 
                                              ? `🚨 ESCALATED: Citizen rejected completion report (Rework Count: ${currentReworkCount}). Escalated to Municipal Officer. Reason: ${rejectionReason}`
                                              : `Citizen rejected completion report. Rework Reason: ${rejectionReason}`,
                                            updatedBy: `${userName} (Resident Auditor)`,
                                            verifiedByCitizen: false,
                                            reworkCount: currentReworkCount,
                                            // If escalated, we clear the worker so the officer must re-assign
                                            assignedWorkerId: isEscalated ? "" : selectedIssue.assignedWorkerId,
                                            assignedWorkerName: isEscalated ? "" : selectedIssue.assignedWorkerName
                                          });

                                          if (isEscalated) {
                                            alert("Escalated! This issue has failed verification multiple times. It is now flagged as 'Officer Review Required' and escalated to the Municipal Officer.");
                                          } else {
                                            alert("Completion rejected. The ticket has been routed back to the worker for rework.");
                                          }
                                          setRejectionReason("");
                                          setShowRejectionForm(false);
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-black py-1 px-2.5 rounded transition-colors uppercase cursor-pointer"
                                      >
                                        Submit Rejection Feedback
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs flex items-center gap-2 text-emerald-800 font-bold font-sans">
                                <span>✅ Thank you! This civic fix has been community-verified and successfully closed. Good job!</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactive Comments & Discussion Feed */}
                    <div className="border-t border-slate-100 pt-5 space-y-4">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-slate-400" /> Community Discussion ({selectedIssue.comments.length})
                      </h5>

                      <div 
                        className="space-y-3 max-h-48 overflow-y-auto overscroll-contain scroll-smooth touch-pan-y"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {selectedIssue.comments.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No feedback posted yet. Encourage nearby citizens to peer-validate.</p>
                        ) : (
                          selectedIssue.comments.map(comment => (
                            <div key={comment.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                              <div className="flex justify-between mb-1.5">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                  {comment.authorName} 
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                    (comment.authorRole === "OFFICER" || comment.authorRole === "AUTHORITY") 
                                      ? "bg-purple-100 text-purple-700" 
                                      : comment.authorRole === "WORKER"
                                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                                        : "bg-blue-100 text-blue-700"
                                  }`}>
                                    {comment.authorRole === "AUTHORITY" ? "OFFICER" : comment.authorRole}
                                  </span>
                                </span>
                                <span className="text-[9px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-slate-600">{comment.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add comment Form */}
                      <form onSubmit={handlePostComment} className="flex gap-2">
                        <input 
                          type="text" 
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Provide local details, context or status update..." 
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        />
                        <button 
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl flex items-center justify-center transition-all shadow"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                    <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-600">No submission selected</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Select an active issue card from the feed leftwards to see high confidence AI classification and discussion boards.</p>
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

        {/* Report Issue Form Tab */}
        {activeTab === "report" && (
          <div 
            className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6 overscroll-contain scroll-smooth touch-pan-y"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Report Hyperlocal Infrastructure Defect
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Snap a photo and describe the problem. NagrikSetu AI checks for duplication instantly and routes the draft.
                </p>
              </div>

              {/* Quick Fill presets row to help showcase Gemini vision capability with perfect mock examples */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 space-y-2.5">
                <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-bounce" /> Recommended: Quick Demo Presets
                </span>
                <p className="text-[11px] text-indigo-900/80">
                  Select a typical Indian community defect below to populate simulated GPS coordinates, description, and high resolution test imagery.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  {PRESET_IMAGES.map((preset, pIdx) => (
                    <button 
                      key={pIdx}
                      type="button"
                      onClick={() => handleQuickPresetFill(preset)}
                      className="bg-white hover:bg-indigo-100 border border-slate-200 p-2.5 rounded-lg text-left text-xs font-bold text-slate-700 hover:text-indigo-950 hover:border-indigo-300 transition-all shadow-sm"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmitIssue} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-500">Unstructured Issue Title</label>
                    <input 
                      type="text" 
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Deep sewage pothole near corner shop" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-500">Evidence Image URL</label>
                    <input 
                      type="text" 
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      placeholder="Paste image link or select preset above" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-500">Problem Description (Bilingual Enabled)</label>
                  <textarea 
                    rows={4}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Provide full description. Mention proximity to children's areas, school, transit stations or commercial blocks for AI severity extraction." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* AI Analyze Draft triggers */}
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={triggerAiAnalysis}
                    disabled={isAnalyzing}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 uppercase tracking-wide"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Querying Gemini AI Engine...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Run Gemini Draft Analysis
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-slate-400 self-center">
                    Uses Multimodal Vision to auto-tag department routing, check duplicate buffers & draft summaries.
                  </span>
                </div>

                {/* AI analysis result preview block */}
                {analysisResult && (
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 space-y-3.5 text-xs">
                    <span className="font-black text-indigo-950 uppercase block tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" /> Gemini AI Extraction Preview
                    </span>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Detected Class</span>
                        <span className="font-bold text-slate-800">{analysisResult.detectedCategory}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Calculated Severity</span>
                        <span className="font-bold text-slate-800">{analysisResult.detectedSeverity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Confidence Score</span>
                        <span className="font-bold text-slate-800">{Math.round(analysisResult.confidenceScore * 100)}% Match</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Duplicate Warning (500m)</span>
                        <span className={`font-bold ${analysisResult.duplicateFound ? "text-red-600" : "text-emerald-600"}`}>
                          {analysisResult.duplicateFound ? "⚠ Duplicate Warning Flags" : "✓ Unique New Report"}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-indigo-100/50 pt-2.5 space-y-2">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Automated Route Assignment</span>
                        <p className="font-bold text-slate-800">{analysisResult.departmentRouting}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Dynamic Priority Score</span>
                        <p className="font-bold text-slate-800">{analysisResult.priorityScore} / 100</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual validation fields override */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-500">Category Override</label>
                    <select 
                      value={formCategory}
                      onChange={(e: any) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700"
                    >
                      {Object.values(IssueCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-500">Severity Override</label>
                    <select 
                      value={formSeverity}
                      onChange={(e: any) => setFormSeverity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700"
                    >
                      {Object.values(IssueSeverity).map(sev => (
                        <option key={sev} value={sev}>{sev}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-500">Simulated Location Capture Address</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Latitude / Longitude details automatically verified" 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setFormLat(12.9716 + (Math.random() - 0.5) * 0.05);
                        setFormLng(77.5946 + (Math.random() - 0.5) * 0.05);
                        setFormAddress("Indiranagar 100 Feet Road intersection, Bengaluru");
                        alert("Geotag successfully captured: 12.9716, 77.5946");
                      }}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3 rounded-xl flex items-center gap-1 transition-all"
                    >
                      <MapPin className="w-4 h-4" /> Trigger GPS
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveTab("dashboard");
                      setAnalysisResult(null);
                    }}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center gap-1.5 uppercase tracking-wide"
                  >
                    Submit Verified Report
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* Leaderboards Tab */}
        {activeTab === "leaderboard" && (
          <div 
            className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 overscroll-contain scroll-smooth touch-pan-y"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> Active Citizen Reputation Leaderboard
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Earn civic points for reporting unique defects, getting peer upvote validation, and commenting verified resolution feedback.
                </p>
              </div>

              {/* Badges system overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex gap-3 text-xs items-center">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-black text-amber-700 shadow shrink-0">
                    🏆
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">City Champion Badge</h5>
                    <p className="text-[10px] text-slate-500">Cross 1,000 points. Auto route bypass reviews.</p>
                  </div>
                </div>

                <div className="flex gap-3 text-xs items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-700 shadow shrink-0">
                    🛡️
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">Local Ward Custodian</h5>
                    <p className="text-[10px] text-slate-500">Upvote and verify 20+ issues with accuracy rate &gt;90%.</p>
                  </div>
                </div>

                <div className="flex gap-3 text-xs items-center">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-700 shadow shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">Top Reporter Badge</h5>
                    <p className="text-[10px] text-slate-500">Submit 10+ successfully addressed infrastructure defects.</p>
                  </div>
                </div>
              </div>

              {/* Leaderboard list */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 text-[10px] font-black text-slate-400 uppercase px-4 pb-2 border-b border-slate-100">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-4">Citizen Reporter</div>
                  <div className="col-span-2 text-center">Ward City</div>
                  <div className="col-span-2 text-center">Reports</div>
                  <div className="col-span-3 text-right">Civic Score</div>
                </div>

                <div className="space-y-2">
                  {LEADERBOARD_USERS.map((lUser, idx) => {
                    const isSelf = lUser.name === userName;
                    return (
                      <div 
                        key={idx}
                        className={`grid grid-cols-12 items-center text-xs p-4 rounded-xl border transition-all ${
                          isSelf 
                            ? "bg-blue-50/50 border-2 border-blue-400 shadow" 
                            : "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                        }`}
                      >
                        <div className="col-span-1 font-black text-slate-800 text-sm">{lUser.rank}</div>
                        <div className="col-span-4">
                          <p className="font-bold text-slate-900 flex items-center gap-1">
                            {lUser.name} {isSelf && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black">YOU</span>}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lUser.badges.map((badge, bIdx) => (
                              <span key={bIdx} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-2 text-center text-slate-600 font-medium">{lUser.city}</div>
                        <div className="col-span-2 text-center text-slate-600 font-bold">{lUser.reportsCount} Submissions</div>
                        <div className="col-span-3 text-right">
                          <span className="font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            {lUser.points} points
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Analytics Hub Tab */}
        {activeTab === "analytics" && (
          <div 
            className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 overscroll-contain scroll-smooth touch-pan-y"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" /> Municipal KPI Dashboard & Predictive Analytics
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Predictive hot-spots, department response velocities, and visual ward charts based on active issue clustering.
                </p>
              </div>

              {/* Aggregate KPI grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400">Avg Resolution SLA</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">1.8 Days</p>
                  <span className="text-[9px] text-emerald-600 font-bold">12% decrease vs last week</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400">Resolution Velocity Rate</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">94%</p>
                  <span className="text-[9px] text-emerald-600 font-bold">SLA Targets certified</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Solved (30d)</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">1,024 Issues</p>
                  <span className="text-[9px] text-slate-500">Across 14 categories</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400">Prevented Redundant Duplicate Spam</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">82 instances</p>
                  <span className="text-[9px] text-indigo-600 font-bold">Via PostGIS spatial checks</span>
                </div>
              </div>

              {/* Department Response velocities bar representation */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Department Resolution Velocity Metrics</h4>
                
                <div className="space-y-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Municipal Road Works Division (BBMP / Noida Authority)</span>
                      <span>88% Resolution (Avg: 24.5 Hrs)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: "88%" }} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Solid Waste Management and Sanitation Department</span>
                      <span>96% Resolution (Avg: 12.2 Hrs)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: "96%" }} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Water Supply and Sewerage Board (MCGM / LMC)</span>
                      <span>92% Resolution (Avg: 18.0 Hrs)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: "92%" }} />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Electrical and Street Lighting Authority</span>
                      <span>78% Resolution (Avg: 36.4 Hrs)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-600 rounded-full" style={{ width: "78%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* K-Means hotspot clustering representation */}
              <div className="bg-amber-50 rounded-2xl p-4.5 border border-amber-100 space-y-3 text-xs">
                <span className="font-black text-amber-950 uppercase tracking-wide block flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> K-Means Spatial Hotspots Detected (High Risk Clusters)
                </span>
                <p className="text-slate-700">
                  The AI consensus engine groups individual issues within a 500-meter threshold to identify high-density civic vulnerability targets. This assists authorities in structural allocation.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800 text-xs">Koramangala 4th Block Cluster</span>
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">High Intensity</span>
                    </div>
                    <p className="text-[11px] text-slate-500">8 reports clustered &bull; Primarily Pothole / Streetlight</p>
                    <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-red-500 w-4/5" />
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800 text-xs">Sector 62 Metro Pillar Area</span>
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Medium Intensity</span>
                    </div>
                    <p className="text-[11px] text-slate-500">5 reports clustered &bull; Garbage / Water Leak</p>
                    <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-amber-500 w-1/2" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Technical Specs Tab */}
        {activeTab === "docs" && (
          <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              
              {/* Docs Tab selector */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 shrink-0 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-5 h-5 text-indigo-600" /> Platform Technical Specifications
                  </h3>
                  <p className="text-[11px] text-slate-500">Real production architecture, database schema, and REST specifications</p>
                </div>

                <div className="flex gap-1.5">
                  <button 
                    onClick={() => setActiveDocSubTab("arch")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                      activeDocSubTab === "arch" ? "bg-blue-600 text-white shadow" : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    Architecture
                  </button>
                  <button 
                    onClick={() => setActiveDocSubTab("db")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                      activeDocSubTab === "db" ? "bg-blue-600 text-white shadow" : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    DB Schema (SQL)
                  </button>
                  <button 
                    onClick={() => setActiveDocSubTab("api")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                      activeDocSubTab === "api" ? "bg-blue-600 text-white shadow" : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    REST spec
                  </button>
                  <button 
                    onClick={() => setActiveDocSubTab("ai")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                      activeDocSubTab === "ai" ? "bg-blue-600 text-white shadow" : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    AI/ML Pipeline
                  </button>
                  <button 
                    onClick={() => setActiveDocSubTab("roadmap")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                      activeDocSubTab === "roadmap" ? "bg-blue-600 text-white shadow" : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    Roadmap
                  </button>
                </div>
              </div>

              {/* Render Selected Spec */}
              <div 
                className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0F172A] text-slate-200 font-mono text-xs leading-relaxed overscroll-contain scroll-smooth touch-pan-y"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {activeDocSubTab === "arch" && (
                  <pre className="whitespace-pre-wrap font-sans max-w-none">{ARCHITECTURE_DOC}</pre>
                )}
                {activeDocSubTab === "db" && (
                  <pre className="whitespace-pre-wrap font-sans max-w-none">{DATABASE_DOC}</pre>
                )}
                {activeDocSubTab === "api" && (
                  <pre className="whitespace-pre-wrap font-sans max-w-none">{API_DOC}</pre>
                )}
                {activeDocSubTab === "ai" && (
                  <pre className="whitespace-pre-wrap font-sans max-w-none">{AI_ML_DOC}</pre>
                )}
                {activeDocSubTab === "roadmap" && (
                  <pre className="whitespace-pre-wrap font-sans max-w-none">{ROADMAP_DOC}</pre>
                )}
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Floating Animated Toast Notification List Overlay */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none font-sans">
        {toasts.map(toast => {
          let bgClass = "bg-slate-900/95 backdrop-blur-md border-slate-700/50";
          let icon = <AlertCircle className="w-4 h-4 text-blue-400" />;
          
          if (toast.type === "success") {
            bgClass = "bg-emerald-950/95 backdrop-blur-md border-emerald-500/30 text-emerald-100";
            icon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
          } else if (toast.type === "error") {
            bgClass = "bg-rose-950/95 backdrop-blur-md border-rose-500/30 text-rose-100";
            icon = <XCircle className="w-4 h-4 text-rose-400" />;
          } else if (toast.type === "info") {
            bgClass = "bg-blue-950/95 backdrop-blur-md border-blue-500/30 text-blue-100";
            icon = <AlertCircle className="w-4 h-4 text-blue-400" />;
          }

          return (
            <div
              key={toast.id}
              className={`${bgClass} border text-xs font-semibold px-4 py-3.5 rounded-2xl shadow-2xl flex items-start gap-3 pointer-events-auto transition-all duration-300 transform translate-x-0 animate-slide-in`}
              style={{
                animation: "slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              }}
            >
              <div className="shrink-0 mt-0.5">{icon}</div>
              <div className="flex-1 whitespace-pre-line leading-relaxed">{toast.message}</div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-white shrink-0 transition-colors ml-1 cursor-pointer font-black"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      {/* Worker Skill Validation Mismatch Dialog Modal */}
      {mismatchPendingWorker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[10000] p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 text-center space-y-4 animate-slide-in">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl animate-bounce">
              ⚠️
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-black text-slate-800">Skill Mismatch Warning</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Selected worker <strong className="text-slate-800">{mismatchPendingWorker.name}</strong> has skill <strong className="text-slate-800">{mismatchPendingWorker.skill}</strong>, which does not match the recommended skill for <strong className="text-slate-800">{selectedIssue?.category}</strong>.
              </p>
              <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg mt-2">
                "Selected worker does not match recommended skill."
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setMismatchPendingWorker(null);
                  setMismatchPendingAction(null);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (mismatchPendingAction) {
                    mismatchPendingAction();
                  }
                  setMismatchPendingWorker(null);
                  setMismatchPendingAction(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-100 transition-colors cursor-pointer"
              >
                Override & Assign
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
