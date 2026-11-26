-- CreateTable
CREATE TABLE "LmsWorkspace" (
    "id" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "logoKey" TEXT,
    "coverKey" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#0094fd',
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsCourse" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverKey" TEXT,
    "level" TEXT NOT NULL DEFAULT 'all',
    "subjectId" TEXT,
    "gradeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "visibility" TEXT NOT NULL DEFAULT 'members',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "videoUrl" TEXT,
    "durationMin" INTEGER,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LmsEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsLessonProgress" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LmsLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsAnnouncement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LmsAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LmsWorkspace_subdomain_key" ON "LmsWorkspace"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "LmsWorkspace_organizationId_key" ON "LmsWorkspace"("organizationId");

-- CreateIndex
CREATE INDEX "LmsWorkspace_ownerId_idx" ON "LmsWorkspace"("ownerId");

-- CreateIndex
CREATE INDEX "LmsWorkspace_organizationId_idx" ON "LmsWorkspace"("organizationId");

-- CreateIndex
CREATE INDEX "LmsCourse_workspaceId_status_idx" ON "LmsCourse"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LmsCourse_workspaceId_slug_key" ON "LmsCourse"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "LmsModule_courseId_idx" ON "LmsModule"("courseId");

-- CreateIndex
CREATE INDEX "LmsLesson_moduleId_idx" ON "LmsLesson"("moduleId");

-- CreateIndex
CREATE INDEX "LmsEnrollment_userId_status_idx" ON "LmsEnrollment"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LmsEnrollment_courseId_userId_key" ON "LmsEnrollment"("courseId", "userId");

-- CreateIndex
CREATE INDEX "LmsLessonProgress_userId_idx" ON "LmsLessonProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LmsLessonProgress_lessonId_userId_key" ON "LmsLessonProgress"("lessonId", "userId");

-- CreateIndex
CREATE INDEX "LmsAnnouncement_workspaceId_pinned_createdAt_idx" ON "LmsAnnouncement"("workspaceId", "pinned", "createdAt");

-- AddForeignKey
ALTER TABLE "LmsWorkspace" ADD CONSTRAINT "LmsWorkspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsWorkspace" ADD CONSTRAINT "LmsWorkspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsCourse" ADD CONSTRAINT "LmsCourse_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "LmsWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsCourse" ADD CONSTRAINT "LmsCourse_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsModule" ADD CONSTRAINT "LmsModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LmsCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsLesson" ADD CONSTRAINT "LmsLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LmsModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsEnrollment" ADD CONSTRAINT "LmsEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LmsCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsEnrollment" ADD CONSTRAINT "LmsEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsLessonProgress" ADD CONSTRAINT "LmsLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LmsLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsLessonProgress" ADD CONSTRAINT "LmsLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsAnnouncement" ADD CONSTRAINT "LmsAnnouncement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "LmsWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsAnnouncement" ADD CONSTRAINT "LmsAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

