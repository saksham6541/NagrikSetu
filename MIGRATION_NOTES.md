# Migration Notes

## Step 0 / Phase 1 — Prisma foundation (complete)

### Acceptance (verified)
- `npx tsc --noEmit` — zero errors
- `npm run dev` — server boots on :3000
- `GET /api/issues` — returns seeded issues from SQLite (HTTP 200)

### Files added
| File | Role |
|------|------|
| `prisma/schema.prisma` | Models: User, Issue, Upvote, Comment, StatusHistory, WorkerAssignment, EvidenceUpload, AIAnalysisResult. SQLite local; switch provider for Postgres. Composite index on Issue(lat, lng). Unique (issueId, voterIdentifier) on Upvote. |
| `src/db.ts` | Singleton `export const prisma = new PrismaClient()` |
| `prisma/seed.ts` | `seedDatabase()` — demo citizen / officer / worker + sample issues |
| `src/types.ts` | Exports `User`, `UserRole`, `EvidenceStage`, `AssignmentStatus` (aligned with schema string values) |

### Setup
```bash
npm install
cp .env.example .env   # DATABASE_URL="file:./dev.db"
npm run prisma:generate
npm run prisma:push
npm run seed           # optional; server auto-seeds if empty
npm run dev
```

### Demo accounts
| Role    | Login                         | Credential   |
|---------|-------------------------------|--------------|
| Citizen | `+919876543210`               | OTP `123456` |
| Officer | `vignesh.officer@bbmp.gov.in` | `changeme123`|
| Worker  | `ramesh.worker@bbmp.gov.in`   | `changeme123`|

### Notes
- User.phone is unique and nullable (staff may omit phone).
- User.email unique nullable; passwordHash nullable for OTP citizens.
- Issue.reporterId is an optional FK to User (set on create from JWT).
- AIAnalysisResult kept because server.ts already creates via `tx.aIAnalysisResult`.

## Phase 2 / 3 — pending
Auth is already wired in server.ts; frontend integration and further restructuring not started.

## Step 1 — Frontend JWT auth wiring (complete)

### Changes in `src/App.tsx`
- Real calls to `POST /api/auth/register`, `/login`, `/verify-otp` (citizens) and `/login-staff` (officers/workers).
- JWT stored in React state + `localStorage` key `ns_token`.
- `GET /api/auth/me` on load restores session.
- `Authorization: Bearer <token>` on issue create, vote, comment, status, AI analyze.
- Removed client-supplied `reporterPhone`, `authorName`/`authorRole`, `updatedBy` on authenticated routes.
- Logout clears token; 401/403 from authenticated fetches forces re-login.
- Role shown from JWT (no more role simulator that fakes officer/worker without a token).

### Acceptance verified via curl
- Citizen OTP → JWT → create issue → 200
- Officer staff login → status update → history `updatedBy` = officer name from JWT
- Unauthenticated create → 401

## Step 2 — Phase 3 modularization (complete)

### Layout
```
src/server/
  app.ts, index.ts
  lib/          config, utils, logger (pino)
  middleware/   auth, error, rateLimit, validate (zod)
  schemas/      auth, issue, ai
  services/     auth, issue, issue-actions, assignment, evidence, ai, analytics
  routes/       auth, issues, assignments, ai, analytics
```
All `src/server/**/*.ts` files are under ~200 lines.

### Validation
Zod schemas on priority routes: register, create issue, status, evidence (plus comment, assign-worker, assignment update, analyze-draft). Malformed bodies → **400** with `error: "Validation failed"`.

### Other
- Central `errorHandler` + `AppError` + `asyncHandler`
- Structured logging via **pino**
- Gemini model kept as **`gemini-3.5-flash`** (confirmed current stable GA model ID)
- Vitest + supertest suite: `npm test` (auth rejection, vote dedup, role checks, validation 400s, AI fallback)

### Entry
- `npm run dev` → `tsx src/server/index.ts`
- Root `server.ts` is a thin shim for compatibility
