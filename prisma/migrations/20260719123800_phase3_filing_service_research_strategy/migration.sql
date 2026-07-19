-- AlterTable
ALTER TABLE "DecisionLogEntry" ADD COLUMN "actualResult" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "aiContribution" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "assumptions" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "counterarguments" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "decidedBy" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "expectedResult" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "issueConsidered" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "options" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "reviewDate" DATETIME;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "risks" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "selectedOption" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "supersededById" TEXT;
ALTER TABLE "DecisionLogEntry" ADD COLUMN "title" TEXT;

-- CreateTable
CREATE TABLE "FilingStageHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filingId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilingStageHistory_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilingLegalIssueLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filingId" TEXT NOT NULL,
    "legalIssueId" TEXT NOT NULL,
    CONSTRAINT "FilingLegalIssueLink_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilingLegalIssueLink_legalIssueId_fkey" FOREIGN KEY ("legalIssueId") REFERENCES "LegalIssue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilingEvidenceLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filingId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'supporting',
    CONSTRAINT "FilingEvidenceLink_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilingEvidenceLink_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilingAuthorityLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filingId" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "pinpoint" TEXT,
    CONSTRAINT "FilingAuthorityLink_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilingAuthorityLink_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "Authority" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilingDiscoveryLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filingId" TEXT NOT NULL,
    "discoveryRequestId" TEXT NOT NULL,
    CONSTRAINT "FilingDiscoveryLink_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilingDiscoveryLink_discoveryRequestId_fkey" FOREIGN KEY ("discoveryRequestId") REFERENCES "DiscoveryRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilingDocumentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filingId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "role" TEXT,
    "pageRange" TEXT,
    CONSTRAINT "FilingDocumentLink_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilingDocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilingChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filingId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "overrideReason" TEXT,
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "isWarning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilingChecklistItem_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilingVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filingId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "contentText" TEXT,
    "storageKey" TEXT,
    "documentId" TEXT,
    "changesSummary" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'draft',
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "hash" TEXT,
    "createdBy" TEXT,
    "sourceVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilingVersion_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilingVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilingSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filingId" TEXT NOT NULL,
    "portal" TEXT,
    "submittedAt" DATETIME,
    "confirmationNumber" TEXT,
    "filingFee" TEXT,
    "docketNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "receiptNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilingSubmission_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilingPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "filingId" TEXT,
    "title" TEXT NOT NULL,
    "portal" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilingPackage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilingPackage_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilingPackageItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "documentId" TEXT,
    "pageRange" TEXT,
    "confidentiality" TEXT NOT NULL DEFAULT 'public',
    "separateUpload" BOOLEAN NOT NULL DEFAULT false,
    "exhibitDesignation" TEXT,
    CONSTRAINT "FilingPackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "FilingPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilingPackageItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CertificateOfService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "filingId" TEXT,
    "serviceDate" DATETIME,
    "servingParty" TEXT,
    "method" TEXT,
    "recipientsText" TEXT,
    "statementText" TEXT,
    "filedStatus" TEXT NOT NULL DEFAULT 'draft',
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CertificateOfService_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CertificateOfService_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "role" TEXT,
    "representedParty" TEXT,
    "mailingAddress" TEXT,
    "serviceAddress" TEXT,
    "email" TEXT,
    "efileParticipant" BOOLEAN NOT NULL DEFAULT false,
    "preferredMethod" TEXT,
    "lastVerified" DATETIME,
    "sourceOfAddress" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceRecipient_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "filingId" TEXT,
    "recipientId" TEXT,
    "recipientName" TEXT NOT NULL,
    "servingParty" TEXT,
    "serviceDate" DATETIME,
    "serviceMethod" TEXT,
    "address" TEXT,
    "trackingNumber" TEXT,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'sent',
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "deadlineId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceEvent_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceEvent_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "ServiceRecipient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunicationAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communicationId" TEXT NOT NULL,
    "documentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunicationAttachment_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunicationAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthorityVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorityId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthorityVerification_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "Authority" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CitationOccurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "filingId" TEXT,
    "documentId" TEXT,
    "citationText" TEXT NOT NULL,
    "location" TEXT,
    "authorityId" TEXT,
    "quotedProposition" TEXT,
    "confidence" REAL,
    "provider" TEXT,
    "flags" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CitationOccurrence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CitationOccurrence_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CitationOccurrence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CitationOccurrence_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "Authority" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "legalIssueId" TEXT,
    "jurisdiction" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'open',
    "searchTerms" TEXT,
    "conclusion" TEXT,
    "contraryAuthority" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchQuestion_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchMemorandum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "filingId" TEXT,
    "title" TEXT NOT NULL,
    "issuePresented" TEXT,
    "briefAnswer" TEXT,
    "facts" TEXT,
    "jurisdiction" TEXT,
    "analysis" TEXT,
    "conclusion" TEXT,
    "unresolved" TEXT,
    "createdBy" TEXT,
    "aiProvider" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchMemorandum_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrategyItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL DEFAULT 'objective',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'active',
    "timeframe" TEXT,
    "assumptions" TEXT,
    "risks" TEXT,
    "counterarguments" TEXT,
    "confidence" REAL,
    "sourceType" TEXT,
    "aiProvider" TEXT,
    "relatedLegalIssueId" TEXT,
    "relatedEvidenceId" TEXT,
    "relatedFilingId" TEXT,
    "supersededById" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'confirmed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrategyItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrategySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrategySnapshot_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpposingPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "party" TEXT,
    "issue" TEXT NOT NULL,
    "positionSummary" TEXT,
    "exactStatement" TEXT,
    "sourceDocumentId" TEXT,
    "sourcePage" TEXT,
    "positionDate" DATETIME,
    "weaknesses" TEXT,
    "userResponse" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "relatedFilingId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpposingPosition_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SettlementRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "sender" TEXT,
    "recipient" TEXT,
    "offerDate" DATETIME,
    "monetaryAmount" REAL,
    "nonmonetaryTerms" TEXT,
    "releaseScope" TEXT,
    "confidentiality" TEXT,
    "dismissalTerms" TEXT,
    "paymentTerms" TEXT,
    "creditReportingTerms" TEXT,
    "taxTerms" TEXT,
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    "sourceCommunicationId" TEXT,
    "strategicAssessment" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SettlementTerm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "settlementId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "category" TEXT,
    CONSTRAINT "SettlementTerm_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "SettlementRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Remedy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "remedyType" TEXT NOT NULL,
    "description" TEXT,
    "legalBasis" TEXT,
    "legalIssueId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "opposingPosition" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Remedy_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIDraftRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "filingId" TEXT,
    "provider" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "sourceScope" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "userEdits" TEXT,
    "destinationFilingId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIDraftRun_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIDraftRun_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DraftReviewIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "filingId" TEXT,
    "location" TEXT,
    "issueType" TEXT NOT NULL,
    "explanation" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "confidence" REAL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DraftReviewIssue_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DraftReviewIssue_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Communication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "sender" TEXT,
    "recipients" TEXT,
    "cc" TEXT,
    "subject" TEXT,
    "summary" TEXT,
    "fullText" TEXT,
    "withParty" TEXT,
    "occurredAt" DATETIME,
    "relatedFilingId" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" DATETIME,
    "confidentiality" TEXT NOT NULL DEFAULT 'public',
    "privilege" TEXT,
    "settlementComm" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'confirmed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Communication_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Communication_relatedFilingId_fkey" FOREIGN KEY ("relatedFilingId") REFERENCES "Filing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Communication" ("caseId", "createdAt", "id", "kind", "occurredAt", "subject", "summary", "withParty") SELECT "caseId", "createdAt", "id", "kind", "occurredAt", "subject", "summary", "withParty" FROM "Communication";
DROP TABLE "Communication";
ALTER TABLE "new_Communication" RENAME TO "Communication";
CREATE TABLE "new_DamageItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "amount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dateRange" TEXT,
    "calculationMethod" TEXT,
    "formula" TEXT,
    "assumptions" TEXT,
    "causationTheory" TEXT,
    "mitigation" TEXT,
    "amountsRecovered" REAL,
    "duplicationConcern" TEXT,
    "basis" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DamageItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DamageItem" ("amount", "basis", "caseId", "category", "createdAt", "id", "label") SELECT "amount", "basis", "caseId", "category", "createdAt", "id", "label" FROM "DamageItem";
DROP TABLE "DamageItem";
ALTER TABLE "new_DamageItem" RENAME TO "DamageItem";
CREATE TABLE "new_Filing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "formalTitle" TEXT,
    "shortTitle" TEXT,
    "filingType" TEXT,
    "filingParty" TEXT,
    "respondingParty" TEXT,
    "motionId" TEXT,
    "deadlineId" TEXT,
    "dueDate" DATETIME,
    "plannedFilingDate" DATETIME,
    "actualFilingDate" DATETIME,
    "filedDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "stage" TEXT NOT NULL DEFAULT 'planned',
    "portalType" TEXT,
    "portalUrl" TEXT,
    "docketNumber" TEXT,
    "description" TEXT,
    "purpose" TEXT,
    "requestedRelief" TEXT,
    "governingRules" TEXT,
    "confidentiality" TEXT NOT NULL DEFAULT 'public',
    "certificateOfService" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "aiProvenance" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'confirmed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Filing_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Filing" ("caseId", "certificateOfService", "createdAt", "filedDate", "id", "status", "title") SELECT "caseId", "certificateOfService", "createdAt", "filedDate", "id", "status", "title" FROM "Filing";
DROP TABLE "Filing";
ALTER TABLE "new_Filing" RENAME TO "Filing";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "FilingLegalIssueLink_filingId_legalIssueId_key" ON "FilingLegalIssueLink"("filingId", "legalIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "FilingEvidenceLink_filingId_evidenceId_relation_key" ON "FilingEvidenceLink"("filingId", "evidenceId", "relation");

-- CreateIndex
CREATE UNIQUE INDEX "FilingAuthorityLink_filingId_authorityId_key" ON "FilingAuthorityLink"("filingId", "authorityId");

-- CreateIndex
CREATE UNIQUE INDEX "FilingDiscoveryLink_filingId_discoveryRequestId_key" ON "FilingDiscoveryLink"("filingId", "discoveryRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "FilingDocumentLink_filingId_documentId_role_key" ON "FilingDocumentLink"("filingId", "documentId", "role");
