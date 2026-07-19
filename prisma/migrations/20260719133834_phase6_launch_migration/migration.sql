-- CreateTable
CREATE TABLE "LaunchCheckRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'development',
    "overall" TEXT NOT NULL,
    "passCount" INTEGER NOT NULL DEFAULT 0,
    "warnCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "results" TEXT NOT NULL,
    "appVersion" TEXT,
    "schemaVersion" TEXT,
    "acknowledgedWarnings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductionBlocker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subsystem" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'launch-blocker',
    "impact" TEXT,
    "reproduction" TEXT,
    "resolution" TEXT,
    "owner" TEXT NOT NULL DEFAULT 'owner',
    "status" TEXT NOT NULL DEFAULT 'open',
    "testingRequired" TEXT,
    "deploymentDependency" TEXT,
    "rollbackImpact" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MigrationBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "userId" TEXT,
    "label" TEXT NOT NULL,
    "sourcePath" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'dry-run',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "needsReview" INTEGER NOT NULL DEFAULT 0,
    "unreadable" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "backupRef" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MigrationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sourcePath" TEXT,
    "sizeBytes" INTEGER,
    "extension" TEXT,
    "hash" TEXT,
    "likelyDate" DATETIME,
    "likelyType" TEXT,
    "duplicateGroup" TEXT,
    "versionGroup" TEXT,
    "unreadable" BOOLEAN NOT NULL DEFAULT false,
    "passwordProtected" BOOLEAN NOT NULL DEFAULT false,
    "classification" TEXT NOT NULL DEFAULT 'pending',
    "confidence" REAL,
    "createdRecords" TEXT,
    "migrationStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MigrationItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MigrationBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LaunchCheckRun_createdAt_idx" ON "LaunchCheckRun"("createdAt");

-- CreateIndex
CREATE INDEX "ProductionBlocker_status_idx" ON "ProductionBlocker"("status");

-- CreateIndex
CREATE INDEX "ProductionBlocker_severity_idx" ON "ProductionBlocker"("severity");

-- CreateIndex
CREATE INDEX "MigrationBatch_caseId_idx" ON "MigrationBatch"("caseId");

-- CreateIndex
CREATE INDEX "MigrationBatch_status_idx" ON "MigrationBatch"("status");

-- CreateIndex
CREATE INDEX "MigrationItem_batchId_idx" ON "MigrationItem"("batchId");

-- CreateIndex
CREATE INDEX "MigrationItem_hash_idx" ON "MigrationItem"("hash");
