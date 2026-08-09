/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ARCHITECTURE_DOC = `
# NAGRIKSETU - SYSTEM ARCHITECTURE

NagrikSetu is designed as a highly scalable, robust, offline-resilient, mobile-first full-stack application. It leverages a modern cloud-native architecture to handle high throughput of media uploads, geo-queries, and AI-driven workflows.

\`\`\`
       +--------------------------------------------------------+
       |                  CLIENT / FRONTEND LAYERS              |
       |  Mobile App (Flutter/React Native) | Web Portal (React) |
       +------------------------------------+-------------------+
                                            | (HTTPS / WSS)
                                            v
+--------------------------------------------------------------------------------+
|                             API GATEWAY & SECURITY                             |
|  - Rate Limiting (Redis) | JWT Auth Validator | Helmet Security Headers       |
+--------------------------------------------------------------------------------+
                                            |
                                            v
+--------------------------------------------------------------------------------+
|                         APPLICATION SERVICES (Node.js/Express)                 |
|  +--------------------+  +-----------------------+  +------------------------+  |
|  |  Citizen Service   |  |   Authority Service   |  |   Consensus Engine     |  |
|  |  - Report Issues   |  |   - Workflows         |  |   - Verification Score |  |
|  |  - Comments & Feed  |  |   - Dispatch Routing  |  |   - Trust Algorithms   |  |
|  +--------------------+  +-----------------------+  +------------------------+  |
+--------------------------------------------------------------------------------+
          |                         |                         |
          v                         v                         v
+------------------+      +-------------------+     +----------------------------+
|  AI/ML ENGINE    |      |  DATA PERSISTENCE |     |    NOTIFICATIONS & QUEUES  |
|  - Gemini API    |      |  - PostgreSQL     |     |    - Redis Pub/Sub         |
|  - Image-to-Insight|    |  - Redis Cache    |     |    - SMS/OTP (Twilio)      |
|  - Duplication   |      |  - Cloud Storage  |     |    - Firebase Push         |
+------------------+      +-------------------+     +----------------------------+
\`\`xx

### Key User Flows

1. **Citizen Reporting Flow**:
   - Camera/Gallery → Compress Image → Capture Lat/Lng (GPS) → Offline DB Queue if no network.
   - On connection: Upload media to Cloud Storage → Send metadata to Citizen API → AI pre-analysis runs.
   - AI determines: Category confidence, severity, and checks spatial indexes (within 500m) for duplication.
   - If duplication is flagged, prompt citizen: "Is this the same issue?" (Yes = merges report; No = creates unique report).

2. **Peer Verification Flow**:
   - Nearby citizens receive geotargeted push notifications → Review reported issue.
   - Upvotes / comments build a peer validation consensus. Once consensus rate reaches >75%, issue is upgraded to "VERIFIED" and auto-dispatched to the department.

3. **Authority Workflow**:
   - Department Officer views a bento-grid prioritized dashboard (AI priority score sorted).
   - Assigns field crew → Crew updates status to "IN PROGRESS" with on-site photos.
   - Resolution is logged → Reporter notified → Nearby verifiers asked to close-loop verify.
`;

export const DATABASE_DOC = `
# NAGRIKSETU - DATABASE SCHEMA (PostgreSQL)

Our relational schema is optimized for geospatial queries using the PostGIS extension, ensuring high performance for duplicate checking and hotspot analysis.

\`\`\`
                     +---------------------+
                     |       users         |
                     +---------------------+
                     | id (PK)             | <-------+
                     | phone_number (UQ)   |         |
                     | name                |         |
                     | city                |         |
                     | trust_score (0-100) |         |
                     | total_points        |         |
                     | role (enum)         |         |
                     | created_at          |         |
                     +---------------------+         |
                               |                     |
                               | (1)                 |
                               v (N)                 | (1)
                     +---------------------+         |
                     |       issues        |         |
                     +---------------------+         |
                     | id (PK)             | <-----+ |
                     | reporter_id (FK)    | ------|-+
                     | title               |       | |
                     | description         |       | |
                     | category (enum)     |       | |
                     | severity (enum)     |       | |
                     | status (enum)       |       | |
                     | geo_location (point)|       | |
                     | address             |       | |
                     | city                |       | |
                     | image_url           |       | |
                     | priority_score      |       | |
                     | upvotes_count       |       | |
                     | assigned_dept       |       | |
                     | created_at          |       | |
                     +---------------------+       | |
                        | (1)           | (1)      | |
                        |               +--------+ | |
                        v (N)                    | | |
                     +---------------------+     | | |
                     |      comments       |     | | |
                     +---------------------+     | | |
                     | id (PK)             |     | | |
                     | issue_id (FK)       | ----+ | |
                     | user_id (FK)        | ------|-+
                     | text                |       |
                     | created_at          |       |
                     +---------------------+       |
                                                   v (N)
                                         +---------------------+
                                         |    status_history   |
                                         +---------------------+
                                         | id (PK)             |
                                         | issue_id (FK)       |
                                         | status (enum)       |
                                         | note                |
                                         | updated_by_id (FK)  |
                                         | updated_at          |
                                         +---------------------+
\`\`\`

### Schema Details & DDL

\`\`\`sql
-- Enable PostGIS for geospatial analysis
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(50),
  trust_score INT DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  total_points INT DEFAULT 0,
  role VARCHAR(20) DEFAULT 'CITIZEN' CHECK (role IN ('CITIZEN', 'AUTHORITY', 'ADMIN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Issues Table
CREATE TABLE issues (
  id VARCHAR(50) PRIMARY KEY,
  reporter_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN ('POTHOLE', 'STREETLIGHT', 'GARBAGE', 'WATER_LEAK', 'SEWAGE', 'ENCROACHMENT', 'OTHER')),
  severity VARCHAR(15) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'VERIFYING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED')),
  location GEOGRAPHY(Point, 4326) NOT NULL, -- Geo point (lat, lng)
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  image_url TEXT,
  priority_score INT DEFAULT 0,
  upvotes_count INT DEFAULT 1,
  assigned_dept VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Geospatial and Status Queries
CREATE INDEX idx_issues_location ON issues USING GIST (location);
CREATE INDEX idx_issues_status ON issues (status);
CREATE INDEX idx_issues_city ON issues (city);
CREATE INDEX idx_issues_category ON issues (category);
\`\`\`
`;

export const API_DOC = `
# NAGRIKSETU - RESTful API SPECIFICATION

The application utilizes a secure, stateful RESTful API Gateway layer with endpoints categorized for citizens, authorities, and administrative tasks.

### 1. Citizen Endpoints

- **POST** \`/api/auth/otp-send\`
  - *Description*: Sends a 6-digit SMS verification code to the phone number.
  - *Payload*: \`{ "phone": "+91 98765 43210" }\`
  - *Response*: \`{ "status": "success", "message": "OTP dispatched" }\`

- **POST** \`/api/auth/otp-verify\`
  - *Description*: Verifies OTP and returns JWT token + profile info.
  - *Payload*: \`{ "phone": "+91 98765 43210", "code": "123456" }\`
  - *Response*: \`{ "token": "jwt_token_here", "user": { "id": "u1", "name": "Rajesh Kumar" } }\`

- **POST** \`/api/issues\`
  - *Description*: Submits a new hyperlocal complaint.
  - *Payload*: 
    \`\`\`json
    {
      "title": "Pothole near sector 4 crossing",
      "description": "Deep hole causing vehicle skidding.",
      "category": "POTHOLE",
      "severity": "HIGH",
      "location": { "lat": 12.9348, "lng": 77.6114, "address": "80ft Road, Koramangala", "city": "Bengaluru" },
      "imageUrl": "data:image/jpeg;base64,...",
      "reporterName": "Rajesh Kumar",
      "reporterPhone": "+919876543210"
    }
    \`\`\`
  - *Response*: \`{ "id": "issue-9812", "status": "OPEN", "priorityScore": 75 }\`

### 2. AI and Automation

- **POST** \`/api/ai/analyze-draft\`
  - *Description*: Analyzes a draft description + photo to auto-categorize, score priority, route department, and draft notification.
  - *Payload*: \`{ "description": "Large garbage dump next to school lane.", "location": { "lat": 12.9, "lng": 77.6 } }\`
  - *Response*: 
    \`\`\`json
    {
      "detectedCategory": "GARBAGE",
      "detectedSeverity": "HIGH",
      "confidenceScore": 0.94,
      "duplicateFound": false,
      "priorityScore": 78,
      "departmentRouting": "Solid Waste Management and Sanitation Department",
      "summaryDraftEn": "Large waste accumulator blocking access path adjacent to institutional building.",
      "summaryDraftHi": "शैक्षणिक भवन के निकट मार्ग को अवरुद्ध करने वाला विशाल कचरा संचय।"
    }
    \`\`\`

### 3. Authority and Admin

- **POST** \`/api/issues/:id/status\`
  - *Description*: Updates complaint status and records history.
  - *Payload*: \`{ "status": "IN_PROGRESS", "note": "Cleanup crew dispatched with dumper", "updatedBy": "Supervisor Yadav" }\`
  - *Response*: \`{ "id": "issue-12", "status": "IN_PROGRESS", "updatedAt": "2026-06-24T..." }\`
`;

export const AI_ML_DOC = `
# NAGRIKSETU - AI/ML IMPLEMENTATION PLAN

NagrikSetu acts as a smart city middleware. Our AI pipeline integrates multimodal vision models, spatial search algorithms, and structured NLP to deliver autonomous triage.

### 1. Image-to-Insight (Computer Vision)
- **Model**: Gemini 3.5 Flash (\`gemini-3.5-flash\`).
- **Functionality**: When a citizen snaps an issue, the platform extracts:
  - **Class**: High accuracy categorization (Pothole vs Garbage vs Water Leak).
  - **Risk Factors**: Detects proximity to schools, children's parks, high-speed arterial roads, or water pipelines to dynamically raise severity.
  - **Damage Extent**: Calculates dimensional scaling or safety thresholds from image boundaries.

### 2. Spatial Duplicate Prevention (Preventing Redundant Spam)
- When a new issue is drafted:
  - We run a PostGIS spatial query checking for any open/assigned complaints of the **same category** within a **500-meter radius**.
  - If match(es) are found, we trigger an AI similarity comparison using description embeddings (\`gemini-embedding-2-preview\`).
  - If similarity score >0.85, we return a duplicate warning:
    \`\`\`
    Duplicate Detection Math:
    Distance (d) = Haversine(Loc_New, Loc_Existing) <= 500m
    Cosine_Similarity(Embed_New, Embed_Existing) >= 0.85
    \`\`\`

### 3. NLP & Dynamic Translation Engine
- **Department Summary Drafting**: To communicate with local government departments, Gemini automatically formats the citizen's unstructured description into:
  - A highly professional English brief.
  - A formal Hindi brief (highly requested for local municipal staff in Northern states).
- **Sentiment & Toxic Filtering**: Comments are parsed to filter profanity or politically motivated targeting, ensuring a constructive community board.

### 4. Dynamic Priority Scoring Algorithm
Priority Score is an integrated function calculated in real-time as:
\`\`\`
Score = (0.35 * SeverityWeight) + (0.30 * CommunityUpvotesWeight) + (0.20 * RiskAreaWeight) + (0.15 * ReporterTrustFactor)
\`\`\`
- **SeverityWeight**: Critical (100), High (75), Medium (50), Low (25).
- **CommunityUpvotesWeight**: Logarithmic scaling of upvotes (up to 50 upvotes maps to 100).
- **RiskArea**: Extracted by spatial intersections with known high-risk polygons (schools, hospitals, transit terminals).
- **ReporterTrust**: Derived from the user's history of verified vs spam reports.
`;

export const ROADMAP_DOC = `
# NAGRIKSETU - PRODUCT ROADMAP & EXECUTION

Our phase-wise delivery strategy is designed to achieve citizen trust, rapid municipality integration, and low-cost sustainable infrastructure.

### Phase 1: MVP - Core Core Citizen and Authority Flow (Month 1-2)
- Build mobile-first responsive web/hybrid reporting layouts.
- Integrate GPS and offline storage (PouchDB / localStorage sync).
- Core RESTful CRUD APIs with Node.js/PostgreSQL.
- Simple department dispatch tables.

### Phase 2: AI Autonomic Triage Integration (Month 3-4)
- Integrate Gemini 3.5 Flash for multimodal Image-to-Insight categorization.
- Implement PostGIS spatial similarity queries for duplicate suppression.
- Launch priority scoring engine.
- Deploy English/Hindi auto-summary drafting for dispatch reports.

### Phase 3: Gamification & Community Guardrails (Month 5-6)
- Launch upvote consensus model (Citizen verification loops).
- Roll out points and badges engine (Active Citizen, Local Verifier, Civic Guard).
- Implement Reporter Trust Score index based on verification history.
- Launch Leaderboard and local reward partnerships (discounts on public transport/utility bills).

### Phase 4: Predict & Prevent (Advanced Analytics) (Month 7-12)
- Build K-means spatial clustering models to map persistent issue hot-spots.
- Time-series modeling to predict seasonal sewage/pothole risks before monsoons.
- Government impact portal showing resolution rate KPIs, team performance, and resource optimization.

---

### Risks & Mitigations

1. **Risk: Spam and Malicious False Reporting**
   - *Mitigation*: Mandatory phone number OTP verification. Implement Reporter Trust Score. Issues reported by users with low trust scores require higher peer upvotes before authority notification.

2. **Risk: Government Inaction / Department Bottlenecks**
   - *Mitigation*: Automated SLA escalations. If an issue of "Critical" status is unassigned for 48 hours, it gets automatically escalated to the District Commissioner and flagged publicly on the citizen board.

3. **Risk: Offline Areas / Low Connectivity**
   - *Mitigation*: SQLite local queue storage on mobile devices. Compresses images heavily to <100KB before transmission once signal is recovered.
`;
