-- CreateTable
CREATE TABLE "CaseReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "sections" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseReview_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocketSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "retrievalMethod" TEXT,
    "retrievalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalReference" TEXT,
    "reliability" TEXT NOT NULL DEFAULT 'user-entered',
    "documentId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocketSource_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocketSource_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocketEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "entryNumber" TEXT,
    "filingDate" DATETIME,
    "enteredDate" DATETIME,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filingParty" TEXT,
    "documentNumber" TEXT,
    "sourceId" TEXT,
    "courtLink" TEXT,
    "relatedFilingId" TEXT,
    "deadlineImplication" TEXT,
    "serviceImplication" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "createdBy" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocketEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocketEntry_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DocketSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocketMonitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "schedule" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'manual-only',
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocketMonitor_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanionDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'mac',
    "tokenHash" TEXT NOT NULL,
    "permittedFolders" TEXT,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME
);

-- CreateTable
CREATE TABLE "DeviceRegistrationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TwoFactorSecret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "recoveryCodes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CaseAiSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'manual',
    "providerAllowlist" TEXT,
    "allowConfidential" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseAiSetting_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProviderUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT,
    "provider" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "tokens" INTEGER,
    "costCents" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CaseReview_caseId_idx" ON "CaseReview"("caseId");

-- CreateIndex
CREATE INDEX "DocketEntry_caseId_idx" ON "DocketEntry"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "DocketEntry_caseId_entryNumber_documentNumber_key" ON "DocketEntry"("caseId", "entryNumber", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocketMonitor_caseId_key" ON "DocketMonitor"("caseId");

-- CreateIndex
CREATE INDEX "CompanionDevice_userId_idx" ON "CompanionDevice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRegistrationCode_code_key" ON "DeviceRegistrationCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorSecret_userId_key" ON "TwoFactorSecret"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseAiSetting_caseId_key" ON "CaseAiSetting"("caseId");

-- CreateIndex
CREATE INDEX "ProviderUsage_provider_idx" ON "ProviderUsage"("provider");

-- CreateIndex
CREATE INDEX "Case_userId_idx" ON "Case"("userId");

-- CreateIndex
CREATE INDEX "Document_caseId_idx" ON "Document"("caseId");
