-- School timetables, school-specific member identifiers and verification codes.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT,
ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN "admissionNo" TEXT,
ADD COLUMN "indexNo" TEXT,
ADD COLUMN "staffId" TEXT,
ADD COLUMN "schoolClassId" TEXT;

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeId" TEXT,
    "section" TEXT,
    "room" TEXT,
    "classTeacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "schoolClassId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "teacher" TEXT,
    "room" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_admissionNo_key" ON "OrganizationMember"("organizationId", "admissionNo");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_indexNo_key" ON "OrganizationMember"("organizationId", "indexNo");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_staffId_key" ON "OrganizationMember"("organizationId", "staffId");

-- CreateIndex
CREATE INDEX "OrganizationMember_schoolClassId_idx" ON "OrganizationMember"("schoolClassId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_organizationId_name_key" ON "SchoolClass"("organizationId", "name");

-- CreateIndex
CREATE INDEX "SchoolClass_organizationId_idx" ON "SchoolClass"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_schoolClassId_dayOfWeek_period_key" ON "TimetableEntry"("schoolClassId", "dayOfWeek", "period");

-- CreateIndex
CREATE INDEX "TimetableEntry_organizationId_idx" ON "TimetableEntry"("organizationId");

-- CreateIndex
CREATE INDEX "VerificationCode_email_purpose_idx" ON "VerificationCode"("email", "purpose");

-- CreateIndex
CREATE INDEX "VerificationCode_phone_purpose_idx" ON "VerificationCode"("phone", "purpose");

-- CreateIndex
CREATE INDEX "VerificationCode_userId_purpose_idx" ON "VerificationCode"("userId", "purpose");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_schoolClassId_fkey" FOREIGN KEY ("schoolClassId") REFERENCES "SchoolClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_schoolClassId_fkey" FOREIGN KEY ("schoolClassId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: accounts created before email verification existed are trusted.
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false;
