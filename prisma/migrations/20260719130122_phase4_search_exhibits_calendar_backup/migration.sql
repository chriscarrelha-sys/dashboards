-- AlterTable
ALTER TABLE "Communication" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "EvidenceItem" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Filing" ADD COLUMN "deletedAt" DATETIME;

-- CreateTable
CREATE TABLE "SearchIndexEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "page" INTEGER,
    "confidentiality" TEXT NOT NULL DEFAULT 'public',
    "createdBy" TEXT,
    "verificationStatus" TEXT,
    "indexedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchIndexEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'case',
    "query" TEXT NOT NULL,
    "filters" TEXT,
    "sort" TEXT,
    "isSmartCollection" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "notify" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedSearch_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExhibitSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'hearing',
    "numberingStyle" TEXT NOT NULL DEFAULT 'numeric',
    "relatedFilingId" TEXT,
    "confidentiality" TEXT NOT NULL DEFAULT 'public',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExhibitSet_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExhibitItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exhibitSetId" TEXT NOT NULL,
    "documentId" TEXT,
    "sourceVersionLabel" TEXT,
    "pageRange" TEXT,
    "exhibitNumber" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "relatedEvidenceId" TEXT,
    "authenticationStatus" TEXT NOT NULL DEFAULT 'not-started',
    "redactionStatus" TEXT NOT NULL DEFAULT 'no-redaction-needed',
    "confidentiality" TEXT NOT NULL DEFAULT 'public',
    "included" BOOLEAN NOT NULL DEFAULT true,
    "pageCount" INTEGER,
    "outputFilename" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExhibitItem_exhibitSetId_fkey" FOREIGN KEY ("exhibitSetId") REFERENCES "ExhibitSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExhibitItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BatesJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "startNumber" INTEGER NOT NULL DEFAULT 1,
    "digitCount" INTEGER NOT NULL DEFAULT 6,
    "suffix" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'document',
    "firstNumber" TEXT,
    "lastNumber" TEXT,
    "totalPages" INTEGER,
    "derivativeDocumentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BatesJob_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Binder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'hearing',
    "purpose" TEXT,
    "relatedFilingId" TEXT,
    "coverPage" BOOLEAN NOT NULL DEFAULT true,
    "tableOfContents" BOOLEAN NOT NULL DEFAULT true,
    "batesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "confidentiality" TEXT NOT NULL DEFAULT 'public',
    "outputFormat" TEXT NOT NULL DEFAULT 'manifest',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Binder_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BinderSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "binderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BinderSection_binderId_fkey" FOREIGN KEY ("binderId") REFERENCES "Binder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BinderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "documentId" TEXT,
    "label" TEXT NOT NULL,
    "pageRange" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BinderItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "BinderSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BinderItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'mocked',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultCalendarId" TEXT,
    "syncMode" TEXT NOT NULL DEFAULT 'confirmed-auto',
    "categories" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "caseId" TEXT,
    "channels" TEXT NOT NULL,
    "schedule" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT,
    "notifKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "channel" TEXT NOT NULL DEFAULT 'dashboard',
    "status" TEXT NOT NULL DEFAULT 'unread',
    "relatedType" TEXT,
    "relatedId" TEXT,
    "snoozeUntil" DATETIME,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationDigest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "period" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'full',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "sizeBytes" INTEGER,
    "location" TEXT,
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "checksum" TEXT,
    "retentionAt" DATETIME,
    "verifiedAt" DATETIME,
    "restoreTestStatus" TEXT NOT NULL DEFAULT 'untested',
    "error" TEXT
);

-- CreateTable
CREATE TABLE "RestorePreview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "backupId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CaseExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'full',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "manifest" TEXT,
    "includesConfidential" BOOLEAN NOT NULL DEFAULT false,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseExport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "detail" TEXT,
    "ip" TEXT,
    "device" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "device" TEXT,
    "ip" TEXT,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SelectedFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'mock',
    "lastScanAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "payloadRef" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SearchIndexEntry_caseId_recordType_idx" ON "SearchIndexEntry"("caseId", "recordType");
