# GuruLens — Complete Project Audit & Upgrade Plan

> **Date:** 2026-11-20  
> **Prepared for:** IneshDev (Pvt) Ltd  
> **Document Version:** 1.0

---

## Executive Summary

This document provides a comprehensive audit of the existing GuruLens codebase and outlines a phased upgrade plan to transform it into a complete educational ecosystem with Channels, ClassHub, Campus, ClassPulse, and subscription management.

**Key Decisions:**
- ✅ Use NEW Neon database: `ancient-hall-97118808`
- ✅ Keep GitHub (`idavingx-commits/Gurulens`) + Cloudflare Workers deployment
- ✅ Preserve existing features, brand identity, and business logic
- ❌ No Netlify or Vercel
- ⏳ Backup old database before cutover

---

## Part 1: Current State Audit

### 1.1 Technology Stack

| Component | Current Version | Notes |
|-----------|-----------------|-------|
| **Framework** | Next.js 16.4.6 | App Router, breaking changes from training data |
| **React** | 19.3.0 | Latest stable |
| **TypeScript** | ^5 | Strict mode |
| **CSS** | Tailwind v4 | `@theme` in globals.css, no config file |
| **Database** | Neon PostgreSQL 18 | Project `cold-haze-56644745` |
| **ORM** | Prisma 6.19.3 | Driver adapter for Cloudflare Workers |
| **Hosting** | Cloudflare Workers | Via OpenNext |
| **Storage** | Neon Object Storage | Bucket `assets`, S3-compatible |

### 1.2 Current Database Schema (34 Tables)

#### Users & Authentication
- `User` — Core user model with roles (student|teacher|moderator|admin)
- `Session` — DB-backed sessions with CSRF

#### Teacher Profiles & Taxonomy
- `TeacherProfile` — Teacher-specific profile data
- `Subject` — 22 subjects
- `District` — 25 districts
- `Grade` — 11 grades (1-11)
- `Language` — 3 languages
- `TeacherSubject`, `TeacherDistrict`, `TeacherGrade`, `TeacherLanguage` — Many-to-many relations

#### Verification & Badges
- `VerificationRequest` — Teacher verification workflow
- `Badge` — Achievement badges
- `BadgeGrant` — Badge assignments to users

#### Content & Social
- `Post` — Posts, announcements, lessons, reels, videos
- `Media` — All uploaded media (images, videos, docs)
- `Comment` — Post comments
- `Reaction` — Likes, loves, claps
- `Follow` — Social following
- `SavedPost` — Bookmarked posts

#### Reviews & Eligibility
- `Review` — Teacher reviews (1-5 stars)
- `ReviewEligibility` — Who can review whom
- `EnrollmentCode` — Codes to verify student-teacher relationship

#### Quizzes
- `Quiz` — Quiz definitions
- `QuizQuestion` — Quiz questions with options
- `QuizAttempt` — Student quiz attempts

#### Moderation & Audit
- `Report` — Content reports
- `ModerationAction` — Moderator actions
- `AuditLog` — System audit trail

#### Memberships
- `MembershipTier` — Patreon-style tiers
- `Membership` — User memberships

#### System
- `Notification` — User notifications
- `Setting` — System settings

### 1.3 Existing Routes

#### Public Routes (`(site)`)
- `/` — Landing page (cinematic design)
- `/explore` — Teacher discovery
- `/teacher/[handle]` — Teacher profile
- `/post/[id]` — Single post view
- `/reels` — Vertical video feed
- `/quiz/[id]` — Quiz view
- `/about`, `/guidelines`, `/privacy`, `/terms`, `/support` — Legal/info pages

#### Protected Routes
- `/feed` — Authenticated user feed
- `/dashboard` — User dashboard
- `/settings` — User settings
- `/saved` — Saved posts
- `/notifications` — User notifications

#### Teacher Studio (`/studio`)
- `/studio` — Studio dashboard
- `/studio/posts` — Manage posts
- `/studio/quizzes` — Manage quizzes
- `/studio/audience` — Audience management
- `/studio/verification` — Verification request

#### Admin Console (`/admin`)
- `/admin` — Admin dashboard
- `/admin/users` — User management
- `/admin/verification` — Verification review
- `/admin/badges` — Badge management
- `/admin/reports` — Report moderation

### 1.4 API Endpoints

- `/api/auth/*` — Login, register, logout, MFA
- `/api/teachers/*` — Teacher search and profiles
- `/api/posts/*` — Post CRUD
- `/api/comments/*` — Comment CRUD
- `/api/reviews/*` — Review CRUD
- `/api/quizzes/*` — Quiz CRUD
- `/api/reports/*` — Reporting
- `/api/media/*` — Media serving
- `/api/upload/*` — File uploads (direct + presigned)
- `/api/studio/*` — Teacher studio APIs
- `/api/admin/*` — Admin APIs

### 1.5 Current Deployment

| Item | Value |
|------|-------|
| **Live URL** | https://gurulens.us |
| **Worker Name** | `gurulens` |
| **Current Version** | `77bb1aa5-4786-4d1b-a5cb-ea4b4cb06835` |
| **www Redirect** | Worker `gurulens-www` → 308 to apex |
| **GitHub Repo** | `https://github.com/idavingx-commits/Gurulens` |
| **Active Branch** | `feat/cloudflare-neon` |
| **Database** | `cold-haze-56644745` (to be replaced) |
| **Storage** | Neon Object Storage bucket `assets` |

---

## Part 2: What Needs to Be Built

### 2.1 GuruLens Channels (Priority: HIGH)

A teacher-focused educational channel system separate from teacher profiles.

**Features Required:**
- [ ] Channel entity (separate from TeacherProfile)
- [ ] 3-channel limit for Free Plan private tuition teachers (server-enforced)
- [ ] Public and private channels
- [ ] Text announcements
- [ ] Image posts
- [ ] Video posts
- [ ] PDF sharing
- [ ] Voice messages with audio player
- [ ] Polls
- [ ] MCQ quizzes
- [ ] Pinned announcements
- [ ] Scheduled posts
- [ ] Emergency/urgent notices
- [ ] Emoji reactions
- [ ] Channel followers
- [ ] Channel analytics
- [ ] Channel search
- [ ] Channel invitations
- [ ] Channel moderation
- [ ] **Independent Channel Verification** (separate from teacher verification)

### 2.2 GuruLens ClassHub (Priority: HIGH)

Complete class management for private tuition teachers and tuition institutes.

**Private Teacher Dashboard:**
- [ ] Dashboard overview
- [ ] Create/manage classes
- [ ] Subject and grade selection
- [ ] Student enrollment
- [ ] Class timetables
- [ ] Attendance tracking
- [ ] Student records
- [ ] Assignments
- [ ] Quizzes (enhanced)
- [ ] Notes and PDFs
- [ ] Class announcements
- [ ] Class reports
- [ ] Manual fee records
- [ ] Parent notifications
- [ ] Linked channels
- [ ] ClassPulse simulator access

**Institute Dashboard:**
- [ ] Institute registration
- [ ] Institute profile
- [ ] Multi-branch management
- [ ] Teacher invitations
- [ ] Staff permissions
- [ ] Class management
- [ ] Student registration
- [ ] Attendance oversight
- [ ] Timetables
- [ ] Notices
- [ ] Class resources
- [ ] Fee records
- [ ] Institute reports
- [ ] Institute channels
- [ ] **Independent Institute Verification**

### 2.3 GuruLens Campus — School Edition (Priority: MEDIUM)

Full school management and communication module.

**School Roles:**
- Principal
- Vice Principal
- Sectional Head
- School Administrator
- Class Teacher
- Subject Teacher
- Student
- Parent
- Authorized Staff

**Features Required:**
- [ ] School registration & verification
- [ ] Principal dashboard
- [ ] Academic year management
- [ ] Grades 1-13 management
- [ ] Class management
- [ ] Teacher management
- [ ] Student management
- [ ] Parent relationships
- [ ] Attendance reports
- [ ] Timetables
- [ ] Official school notices
- [ ] Channel permissions
- [ ] Notice approval workflows
- [ ] Examination management
- [ ] Results
- [ ] School events
- [ ] Clubs and societies
- [ ] Staff management
- [ ] Audit logs

**School Channels:**
- [ ] Official School Channel
- [ ] Grade channels
- [ ] Class channels
- [ ] Staff channels
- [ ] Subject channels
- [ ] Media Unit channels
- [ ] Clubs and societies
- [ ] Sports teams
- [ ] School events

### 2.4 GuruLens ClassPulse (Priority: LOW)

Attendance hardware simulator and future device management.

**Web Dashboard:**
- [ ] Virtual device registration
- [ ] Device management
- [ ] Class assignment
- [ ] Student card simulation
- [ ] Attendance simulation
- [ ] Check-in/out simulation
- [ ] Device event logs
- [ ] Connectivity testing
- [ ] Classroom feedback simulation
- [ ] Teacher reports
- [ ] Device status management

**Future Hardware Integration:**
- [ ] Secure integration APIs
- [ ] ESP32 device support (future)
- [ ] Web Serial connectivity (future)

### 2.5 Subscription & Plans (Priority: MEDIUM)

**Plans:**
- [ ] GuruLens Free (3 channels for private teachers)
- [ ] GuruLens Teacher Pro
- [ ] GuruLens Institute
- [ ] GuruLens Institute Plus
- [ ] GuruLens Campus Pilot
- [ ] GuruLens Campus Pro

**Features:**
- [ ] Plan management
- [ ] Feature entitlements
- [ ] Channel quotas
- [ ] Class quotas
- [ ] Storage quotas
- [ ] Trial management
- [ ] Upgrade/downgrade handling

### 2.6 Enhanced Account System

**New Roles Required:**
- [ ] Parent/Guardian
- [ ] Institute Owner
- [ ] Institute Manager
- [ ] Principal
- [ ] School Administrator

**Multi-Role Support:**
- [ ] User can have multiple roles
- [ ] Role-based + workspace-based permissions
- [ ] Organization context switching

### 2.7 Four Independent Verification Workflows

1. **Verified Teacher** — Personal teacher verification
2. **Verified Channel** — Channel-specific verification
3. **Verified Institute** — Tuition institute verification
4. **Verified School** — School verification

Each must be independently reviewable, approvable, suspendable.

---

## Part 3: New Database Schema Design

### 3.1 New Tables Required (~40+ new tables)

#### Organizations
```
Organization
├── id, type (institute|school), name, slug, logo, cover
├── verifiedStatus, verifiedAt
├── settings (JSON)
└── createdAt, updatedAt

OrganizationBranch (for multi-branch institutes)
├── id, organizationId, name, address, isMain
└── createdAt, updatedAt

OrganizationMember
├── id, organizationId, userId, role, permissions
├── branchId (optional), status
└── createdAt, updatedAt
```

#### Channels
```
Channel
├── id, ownerId, ownerType (user|organization)
├── name, slug, description, avatarKey, coverKey
├── visibility (public|private), type (personal|institute|school)
├── verifiedStatus, verifiedAt
├── followerCount, postCount
└── createdAt, updatedAt

ChannelFollow
├── channelId, userId
└── createdAt

ChannelPost
├── id, channelId, authorId
├── type (text|image|video|audio|poll|quiz|announcement)
├── content, mediaKeys (JSON), pinned, scheduledAt
├── isUrgent, moderationStatus
└── createdAt, updatedAt

ChannelReaction
├── channelPostId, userId, type
└── createdAt

VoiceMessage
├── id, channelPostId, audioKey, durationSec
└── createdAt

Poll
├── id, channelPostId, question, options (JSON)
├── allowMultiple, endsAt
└── createdAt

PollVote
├── pollId, userId, optionIndex
└── createdAt
```

#### ClassHub
```
Class
├── id, teacherId, organizationId (optional)
├── name, subjectId, gradeId
├── mode (physical|online|both), schedule (JSON)
├── maxStudents, feeAmount, feeCurrency
├── status (active|archived|draft)
└── createdAt, updatedAt

ClassEnrollment
├── id, classId, studentId
├── status (active|completed|withdrawn)
├── enrolledAt, completedAt
└── createdAt, updatedAt

ClassSession
├── id, classId, scheduledAt, duration
├── topic, notes, status (scheduled|completed|cancelled)
└── createdAt, updatedAt

Attendance
├── id, sessionId, studentId
├── status (present|absent|late|excused)
├── checkedInAt, checkedOutAt, method (manual|device|virtual)
└── createdAt

Assignment
├── id, classId, title, description
├── dueAt, maxScore, attachments (JSON)
└── createdAt, updatedAt

Submission
├── id, assignmentId, studentId
├── content, attachments (JSON), score
├── submittedAt, gradedAt
└── createdAt, updatedAt
```

#### Campus (School-specific)
```
AcademicYear
├── id, schoolId, name, startDate, endDate, isCurrent
└── createdAt, updatedAt

SchoolClass (Grade-Class e.g., "10-A")
├── id, schoolId, academicYearId, gradeId
├── section, classTeacherId
└── createdAt, updatedAt

SchoolStudent
├── id, schoolId, userId, admissionNo
├── currentClassId, enrolledAt
└── createdAt, updatedAt

Guardian
├── id, userId (parent account)
├── relationship
└── createdAt, updatedAt

GuardianStudent
├── guardianId, studentUserId
├── isPrimary
└── createdAt

Examination
├── id, schoolId, academicYearId
├── name, type (term|mid-term|final)
├── startDate, endDate
└── createdAt, updatedAt

ExamResult
├── id, examinationId, studentId, subjectId
├── marks, grade, teacherRemarks
└── createdAt, updatedAt

SchoolEvent
├── id, schoolId, title, description
├── startAt, endAt, location, type
└── createdAt, updatedAt

Club
├── id, schoolId, name, description
├── advisorId, type (academic|sports|cultural)
└── createdAt, updatedAt

ClubMember
├── clubId, studentId, role
└── createdAt
```

#### ClassPulse
```
VirtualDevice
├── id, organizationId, name, deviceCode
├── status (active|inactive|simulated)
├── lastSeen, firmwareVersion
└── createdAt, updatedAt

DeviceEvent
├── id, deviceId, eventType, payload (JSON)
├── isSimulated
└── createdAt

StudentCard
├── id, studentId, cardNumber
├── isActive, issuedAt, expiresAt
└── createdAt
```

#### Subscriptions
```
Plan
├── id, name, slug, description
├── type (free|teacher_pro|institute|campus)
├── priceLkr, billingCycle
├── limits (JSON: channels, classes, storage, etc.)
├── isActive
└── createdAt, updatedAt

UserSubscription
├── id, userId, organizationId (optional)
├── planId, status (active|cancelled|expired|trial)
├── startedAt, expiresAt, trialEndsAt
└── createdAt, updatedAt

FeatureEntitlement
├── id, subscriptionId
├── feature, limit, used
└── createdAt, updatedAt
```

---

## Part 4: Implementation Phases

### Phase 1: Database Migration & Core Setup (Week 1)
**Goal:** Switch to new Neon database with extended schema

1. Backup old database (`cold-haze-56644745`)
2. Link to new Neon project (`ancient-hall-97118808`)
3. Create extended Prisma schema with all new tables
4. Generate and apply migrations
5. Update `neon.ts` for services
6. Run `neon deploy` to provision Object Storage
7. Seed reference data
8. Verify all existing features work

### Phase 2: Multi-Role & Organization System (Week 2)
**Goal:** Foundation for institutes, schools, and multi-role users

1. Implement Organization model
2. Implement OrganizationMember with roles
3. Add organization context to auth
4. Create organization registration flows
5. Implement role-based permissions
6. Add organization switcher UI

### Phase 3: GuruLens Channels (Week 3-4)
**Goal:** Complete channel system with 3-channel limit

1. Implement Channel model and APIs
2. Build channel creation with quota enforcement
3. Implement channel posts (text, image, video, audio)
4. Add voice message recording/playback
5. Implement polls and in-channel quizzes
6. Build channel discovery and search
7. Add channel verification workflow
8. Build channel analytics

### Phase 4: ClassHub for Teachers (Week 5-6)
**Goal:** Class management for private tuition teachers

1. Implement Class model and CRUD
2. Build class enrollment system
3. Implement attendance tracking
4. Add assignment system
5. Build student progress tracking
6. Implement fee tracking (manual)
7. Build teacher dashboard
8. Add class-to-channel linking

### Phase 5: Institute Dashboard (Week 7-8)
**Goal:** Multi-branch institute management

1. Extend Organization for institutes
2. Implement branch management
3. Build teacher invitation system
4. Implement institute-wide class management
5. Add institute reports
6. Build institute verification workflow

### Phase 6: Campus School Edition (Week 9-11)
**Goal:** Complete school management module

1. Implement school-specific models
2. Build academic year management
3. Implement class (section) management
4. Build guardian-student linking
5. Implement examination system
6. Add results management
7. Build school channels
8. Implement notice approval workflows
9. Add school verification

### Phase 7: ClassPulse Simulator (Week 12)
**Goal:** Virtual attendance device system

1. Implement virtual device management
2. Build attendance simulation
3. Create device event logging
4. Add check-in/out simulation
5. Build teacher attendance reports

### Phase 8: Subscriptions & Plans (Week 13)
**Goal:** Configurable subscription system

1. Implement Plan model
2. Build subscription management
3. Add feature entitlements
4. Implement quota enforcement
5. Build admin plan management
6. Add upgrade/downgrade flows

### Phase 9: Enhanced Reels & UI Polish (Week 14)
**Goal:** Premium vertical video experience

1. Optimize video delivery
2. Add comments and replies
3. Implement share functionality
4. Add creator dashboard
5. Performance optimization

### Phase 10: Admin Control Center (Week 15)
**Goal:** Complete admin management

1. Extend admin for all new features
2. Build verification review (4 types)
3. Add subscription management
4. Implement feature flags
5. Build comprehensive audit logs

### Phase 11: Testing & Security (Week 16)
**Goal:** Production-ready security and testing

1. Add integration tests
2. Implement permission tests
3. Security audit
4. Performance testing
5. Accessibility checks

### Phase 12: Deployment & Launch (Week 17)
**Goal:** Production deployment

1. Final build verification
2. Deploy to staging
3. User acceptance testing
4. DNS and domain verification
5. Production deployment
6. Post-deployment monitoring

---

## Part 5: Technical Decisions

### 5.1 Database Transition

**Old Database:** `cold-haze-56644745` (Neon, ap-southeast-1)
- Keep read-only for backup
- Do not delete until verified cutover

**New Database:** `ancient-hall-97118808` (Neon, ap-southeast-1)
- Same region ensures Object Storage, Functions, etc. available
- Fresh schema with all new tables
- Production branch: `br-soft-dew-aoz4mgtd`

### 5.2 Storage Strategy

| Content Type | Storage | Access |
|--------------|---------|--------|
| Avatars, covers | Neon Object Storage | Public (via /api/media) |
| Channel media | Neon Object Storage | Public/Private |
| Voice messages | Neon Object Storage | Channel members only |
| Documents/PDFs | Neon Object Storage | Authorized only |
| Reels/Videos | Neon Object Storage | Public (via /api/media) |
| School documents | Neon Object Storage | Strictly private |

### 5.3 Authentication Strategy

**Keep existing custom auth** (not migrating to Neon Auth):
- DB-backed sessions work well
- CSRF protection in place
- MFA already implemented
- Would require significant rewrite to migrate

### 5.4 Cloudflare Workers Considerations

- **CPU Limit:** 10ms on Free plan (bcrypt is tight)
- **Recommendation:** Workers Paid ($5/month) for reliability
- **Hybrid DB Adapter:** HTTP queries + WS transactions (already implemented)

### 5.5 Localization Approach

- Use `next-intl` or similar for i18n
- Support: English, Sinhala, Tamil
- Language stored in user preferences
- Fallback to English

---

## Part 6: Risk Assessment

### High Risk
1. **Schema Migration Complexity** — 40+ new tables
   - Mitigation: Incremental migrations, thorough testing
   
2. **Workers CPU Limits** — Complex SSR may timeout
   - Mitigation: Optimize rendering, consider Workers Paid

### Medium Risk
3. **Multi-Role Complexity** — Permission edge cases
   - Mitigation: Comprehensive permission tests
   
4. **Storage Costs** — Video storage can grow
   - Mitigation: Implement quotas, compression

### Low Risk
5. **UI Consistency** — Many new pages
   - Mitigation: Component library, design system

---

## Part 7: Success Criteria

### Must Have (MVP)
- [ ] Channels with 3-channel limit
- [ ] Basic ClassHub for teachers
- [ ] Institute registration
- [ ] Four verification workflows
- [ ] Basic subscription management

### Should Have
- [ ] Voice messages
- [ ] Polls and quizzes in channels
- [ ] Advanced teacher dashboard
- [ ] Institute multi-branch

### Nice to Have
- [ ] Campus module
- [ ] ClassPulse simulator
- [ ] Advanced analytics
- [ ] Full localization

---

## Part 8: Immediate Next Steps

1. **Confirm new database** — Link `ancient-hall-97118808`
2. **Create extended schema** — All new models
3. **Apply migrations** — Fresh database setup
4. **Provision services** — Object Storage, etc.
5. **Verify existing features** — Smoke test
6. **Begin Phase 2** — Multi-role system

---

**Document prepared by:** AI Agent  
**Review required:** Project Owner  
**Approval status:** PENDING

---

*This is a living document. Update as implementation progresses.*
