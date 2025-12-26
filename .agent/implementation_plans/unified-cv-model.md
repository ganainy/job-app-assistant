# Unified CV Model Implementation Plan

## Overview

Refactor the CV storage architecture to use a single unified `CV` model instead of storing master CVs in `User.cvJson` and job-specific CVs in `JobApplication.draftCvJson`. This provides a cleaner architecture with proper IDs and an `isMasterCv` flag to distinguish CV types.

**Design Decisions (Approved):**
- ❌ No version history - job CVs act as snapshots
- ✅ Cascade delete - job CV deleted when job deleted
- ✅ Per-CV template with inheritance from user default
- ✅ Replace (delete old) when promoting

---

## Implementation Status: COMPLETE ✅

### ✅ Phase 1: Create New CV Model (COMPLETE)
- [x] Created `server/src/models/CV.ts` with unified schema
- [x] Added unique partial index for master CV per user
- [x] Added cascade delete middleware to JobApplication model
- [x] Static methods: `getMasterCv`, `getUserCvs`, `getJobCv`, `promoteToMaster`

### ✅ Phase 2: Create New Backend Routes (COMPLETE)
- [x] Created `server/src/routes/cvs.ts` with all endpoints
- [x] Removed old `cv.ts` routes
- [x] Updated `server/src/index.ts` to use new routes at `/api/cvs`

**Endpoints available:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cvs` | Get all user's CVs |
| `GET` | `/api/cvs/master` | Get the master CV |
| `GET` | `/api/cvs/:id` | Get CV by ID |
| `GET` | `/api/cvs/job/:jobId` | Get CV for a job |
| `POST` | `/api/cvs/upload` | Upload and parse new CV |
| `POST` | `/api/cvs/job/:jobId` | Create job CV |
| `PUT` | `/api/cvs/:id` | Update a CV |
| `DELETE` | `/api/cvs/:id` | Delete a CV |
| `POST` | `/api/cvs/:id/promote` | Promote to master |
| `POST` | `/api/cvs/:id/preview` | Generate PDF preview |
| `POST` | `/api/cvs/preview` | Preview without saving |

### ✅ Phase 3: Update Frontend API Service (COMPLETE)
- [x] Replaced `client/src/services/cvApi.ts` with new unified API
- [x] New types: `CVDocument`, `GetAllCvsResponse`, etc.
- [x] New functions: `getAllCvs`, `getMasterCv`, `getCvById`, `updateCv`, `deleteCv`, `promoteCvToMaster`
- [x] Helper functions: `filterMasterCv`, `filterJobCvs`, `findCvForJob`

### ✅ Phase 4: Update Frontend State Management (COMPLETE)
- [x] Updated `CVManagementPage.tsx` to use unified CV model
- [x] State uses `allCvs: CVDocument[]` instead of separate arrays
- [x] Computed `masterCv` and `jobCvs` from `allCvs`
- [x] `activeCvId` now stores actual CV `_id` (not 'master' string)
- [x] All CRUD operations use unified `updateCv()` and `deleteCv()` APIs
- [x] Updated `Sidebar.tsx` to use `CVDocument` type

### ✅ Phase 5: Data Migration Script (COMPLETE)
- [x] Created `server/src/scripts/migrate-cvs.ts`
- [x] Migration script executed successfully

**To run migration again (if needed):**
```bash
cd server
npx ts-node src/scripts/migrate-cvs.ts
```

### ✅ Phase 6: Update Dependent Features (COMPLETE)
- [x] Updated `ReviewFinalizePage.tsx` to read/write unified CV model
- [x] Updated `server/src/routes/generator.ts` (draft generation, PDF rendering) to use CV model
- [x] Updated `server/src/controllers/atsController.ts` to read from CV model
- [x] Updated generic analysis to support unified CV data

### ⏳ Phase 7: Cleanup (NEXT STEP)
These are cleanup tasks now that all reads/writes are migrated:
- [ ] Remove legacy `cvJson` and `cvFilename` fields from `server/src/models/User.ts`
- [ ] Remove legacy `draftCvJson` field from `server/src/models/JobApplication.ts`
- [ ] Remove legacy `server/src/routes/cv.ts` file (if not already done)

---

## Architecture After Migration

```
┌─────────────────────────────────────────┐
│                CV Model                  │
│  ─────────────────────────────────────  │
│  _id           ObjectId                  │
│  userId        ObjectId (ref: User)      │
│  isMasterCv    Boolean                   │
│  jobAppId?     ObjectId (ref: JobApp)    │
│  cvJson        JsonResumeSchema          │
│  templateId?   String                    │
│  filename?     String                    │
│  analysisCache Object                    │
│  timestamps    createdAt, updatedAt      │
└─────────────────────────────────────────┘
          │
          ├── isMasterCv: true → Master CV (one per user)
          │
          └── isMasterCv: false → Job CV (linked to JobApplication)
```

---

## Files Changed

### Server
- `server/src/models/CV.ts` (NEW)
- `server/src/models/JobApplication.ts` (modified - cascade delete)
- `server/src/routes/cvs.ts` (NEW)
- `server/src/routes/cv.ts` (DELETED)
- `server/src/index.ts` (modified - route registration)
- `server/src/scripts/migrate-cvs.ts` (NEW)

### Client
- `client/src/services/cvApi.ts` (replaced with unified API)
- `client/src/pages/CVManagementPage.tsx` (major refactor)
- `client/src/components/cv-management/Sidebar.tsx` (updated props)
