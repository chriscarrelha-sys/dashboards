-- AlterTable
ALTER TABLE "ReviewQueueItem" ADD COLUMN "reason" TEXT;
ALTER TABLE "ReviewQueueItem" ADD COLUMN "sourcePage" TEXT;

-- CreateTable
CREATE TABLE "LegalIssueElement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legalIssueId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "standard" TEXT,
    "burdenHolder" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unsupported',
    "assessment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalIssueElement_legalIssueId_fkey" FOREIGN KEY ("legalIssueId") REFERENCES "LegalIssue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceLegalIssueLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evidenceId" TEXT NOT NULL,
    "legalIssueId" TEXT NOT NULL,
    "elementId" TEXT,
    "relation" TEXT NOT NULL DEFAULT 'supporting',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceLegalIssueLink_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvidenceLegalIssueLink_legalIssueId_fkey" FOREIGN KEY ("legalIssueId") REFERENCES "LegalIssue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvidenceLegalIssueLink_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "LegalIssueElement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LegalIssueAuthorityLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legalIssueId" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "elementId" TEXT,
    "proposition" TEXT,
    "pinpoint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalIssueAuthorityLink_legalIssueId_fkey" FOREIGN KEY ("legalIssueId") REFERENCES "LegalIssue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LegalIssueAuthorityLink_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "Authority" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LegalIssueAuthorityLink_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "LegalIssueElement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceDiscoveryLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evidenceId" TEXT NOT NULL,
    "discoveryRequestId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceDiscoveryLink_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvidenceDiscoveryLink_discoveryRequestId_fkey" FOREIGN KEY ("discoveryRequestId") REFERENCES "DiscoveryRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceTimelineLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evidenceId" TEXT NOT NULL,
    "timelineEventId" TEXT NOT NULL,
    CONSTRAINT "EvidenceTimelineLink_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvidenceTimelineLink_timelineEventId_fkey" FOREIGN KEY ("timelineEventId") REFERENCES "TimelineEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceMotionLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evidenceId" TEXT NOT NULL,
    "motionId" TEXT NOT NULL,
    CONSTRAINT "EvidenceMotionLink_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvidenceMotionLink_motionId_fkey" FOREIGN KEY ("motionId") REFERENCES "Motion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceDocumentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evidenceId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "page" TEXT,
    CONSTRAINT "EvidenceDocumentLink_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvidenceDocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContradictionStatement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contradictionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "documentId" TEXT,
    "sourcePage" TEXT,
    "author" TEXT,
    "statementDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContradictionStatement_contradictionId_fkey" FOREIGN KEY ("contradictionId") REFERENCES "Contradiction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContradictionStatement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscoverySet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "discoveryType" TEXT NOT NULL,
    "servingParty" TEXT,
    "respondingParty" TEXT,
    "servedDate" DATETIME,
    "serviceMethod" TEXT,
    "responseDeadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'served',
    "sourceDocumentId" TEXT,
    "certificateOfService" BOOLEAN NOT NULL DEFAULT false,
    "governingRule" TEXT,
    "createdBy" TEXT,
    "aiProvider" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscoverySet_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscoverySet_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscoveryDeficiency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "discoveryRequestId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "explanation" TEXT,
    "responseText" TEXT,
    "sourceDocumentId" TEXT,
    "sourcePage" TEXT,
    "missingInformation" TEXT,
    "governingRule" TEXT,
    "dateIdentified" DATETIME,
    "cureRequested" BOOLEAN NOT NULL DEFAULT false,
    "cureDeadline" DATETIME,
    "meetConferStatus" TEXT,
    "opposingResponse" TEXT,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'proposed',
    "motionStatus" TEXT,
    "createdBy" TEXT,
    "aiProvider" TEXT,
    "confidence" REAL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscoveryDeficiency_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscoveryDeficiency_discoveryRequestId_fkey" FOREIGN KEY ("discoveryRequestId") REFERENCES "DiscoveryRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DiscoveryDeficiency_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetAndConferRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "communicationDate" DATETIME,
    "communicationType" TEXT,
    "participants" TEXT,
    "summary" TEXT,
    "demand" TEXT,
    "cureDeadline" DATETIME,
    "responseReceived" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "communicationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeetAndConferRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetAndConferRecord_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subpoena" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "subpoenaType" TEXT NOT NULL,
    "issuingCourt" TEXT,
    "recipient" TEXT NOT NULL,
    "requested" TEXT,
    "dateIssued" DATETIME,
    "dateServed" DATETIME,
    "serviceMethod" TEXT,
    "complianceDate" DATETIME,
    "objectionsDeadline" DATETIME,
    "objectionsReceived" TEXT,
    "productionReceived" BOOLEAN NOT NULL DEFAULT false,
    "custodianInfo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subpoena_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deposition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "witnessId" TEXT,
    "noticeDate" DATETIME,
    "depositionDate" DATETIME,
    "location" TEXT,
    "examiningParty" TEXT,
    "defendingParty" TEXT,
    "topics" TEXT,
    "transcriptPages" TEXT,
    "keyAdmissions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'noticed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deposition_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deposition_witnessId_fkey" FOREIGN KEY ("witnessId") REFERENCES "Witness" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthenticationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "evidenceId" TEXT,
    "documentId" TEXT,
    "authenticatingWitness" TEXT,
    "businessRecordCert" BOOLEAN NOT NULL DEFAULT false,
    "publicRecordBasis" BOOLEAN NOT NULL DEFAULT false,
    "selfAuthTheory" TEXT,
    "custodianDeclaration" BOOLEAN NOT NULL DEFAULT false,
    "chainOfCustody" TEXT,
    "originalVsCopy" TEXT,
    "hearsayConcern" TEXT,
    "hearsayException" TEXT,
    "bestEvidenceConcern" TEXT,
    "completenessConcern" TEXT,
    "foundationChecklist" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unresolved',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthenticationRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuthenticationRecord_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuthenticationRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Admission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "title" TEXT,
    "statement" TEXT NOT NULL,
    "verbatimText" TEXT,
    "category" TEXT,
    "admittingParty" TEXT,
    "byParty" TEXT,
    "sourceRef" TEXT,
    "documentId" TEXT,
    "sourcePage" TEXT,
    "admissionDate" DATETIME,
    "scope" TEXT,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "withdrawn" BOOLEAN NOT NULL DEFAULT false,
    "significance" TEXT,
    "createdBy" TEXT,
    "aiProvider" TEXT,
    "confidence" REAL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admission_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Admission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Admission" ("byParty", "caseId", "createdAt", "id", "sourceRef", "statement") SELECT "byParty", "caseId", "createdAt", "id", "sourceRef", "statement" FROM "Admission";
DROP TABLE "Admission";
ALTER TABLE "new_Admission" RENAME TO "Admission";
CREATE TABLE "new_Authority" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "court" TEXT,
    "jurisdiction" TEXT,
    "year" INTEGER,
    "proposition" TEXT,
    "summary" TEXT,
    "url" TEXT,
    "pinpoint" TEXT,
    "quotedText" TEXT,
    "treatment" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "dateVerified" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Authority_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Authority" ("caseId", "citation", "createdAt", "id", "summary", "url") SELECT "caseId", "citation", "createdAt", "id", "summary", "url" FROM "Authority";
DROP TABLE "Authority";
ALTER TABLE "new_Authority" RENAME TO "Authority";
CREATE TABLE "new_Contradiction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT NOT NULL,
    "statementA" TEXT,
    "statementB" TEXT,
    "explanation" TEXT,
    "materiality" TEXT,
    "significance" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "impeachment" BOOLEAN NOT NULL DEFAULT false,
    "relatedWitnessId" TEXT,
    "createdBy" TEXT,
    "aiProvider" TEXT,
    "confidence" REAL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contradiction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contradiction_relatedWitnessId_fkey" FOREIGN KEY ("relatedWitnessId") REFERENCES "Witness" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contradiction" ("caseId", "confidence", "createdAt", "id", "statementA", "statementB", "summary", "verificationStatus") SELECT "caseId", "confidence", "createdAt", "id", "statementA", "statementB", "summary", "verificationStatus" FROM "Contradiction";
DROP TABLE "Contradiction";
ALTER TABLE "new_Contradiction" RENAME TO "Contradiction";
CREATE TABLE "new_DiscoveryRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "setId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT,
    "requestNumber" INTEGER,
    "requestText" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'outgoing',
    "servingParty" TEXT,
    "respondingParty" TEXT,
    "servedDate" DATETIME,
    "dueDate" DATETIME,
    "responseText" TEXT,
    "objections" TEXT,
    "admissionResponse" TEXT,
    "batesRange" TEXT,
    "deficiencyStatus" TEXT,
    "supplementationStatus" TEXT,
    "meetConferStatus" TEXT,
    "motionStatus" TEXT,
    "sourcePage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscoveryRequest_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscoveryRequest_setId_fkey" FOREIGN KEY ("setId") REFERENCES "DiscoverySet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DiscoveryRequest" ("caseId", "createdAt", "direction", "dueDate", "id", "kind", "servedDate", "status", "title") SELECT "caseId", "createdAt", "direction", "dueDate", "id", "kind", "servedDate", "status", "title" FROM "DiscoveryRequest";
DROP TABLE "DiscoveryRequest";
ALTER TABLE "new_DiscoveryRequest" RENAME TO "DiscoveryRequest";
CREATE TABLE "new_DiscoveryResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discoveryRequestId" TEXT NOT NULL,
    "summary" TEXT,
    "responseText" TEXT,
    "objections" TEXT,
    "verificationText" TEXT,
    "batesRange" TEXT,
    "supplemental" BOOLEAN NOT NULL DEFAULT false,
    "servedDate" DATETIME,
    "hasDeficiencies" BOOLEAN NOT NULL DEFAULT false,
    "deficiencyNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscoveryResponse_discoveryRequestId_fkey" FOREIGN KEY ("discoveryRequestId") REFERENCES "DiscoveryRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DiscoveryResponse" ("createdAt", "deficiencyNote", "discoveryRequestId", "hasDeficiencies", "id", "servedDate", "summary") SELECT "createdAt", "deficiencyNote", "discoveryRequestId", "hasDeficiencies", "id", "servedDate", "summary" FROM "DiscoveryResponse";
DROP TABLE "DiscoveryResponse";
ALTER TABLE "new_DiscoveryResponse" RENAME TO "DiscoveryResponse";
CREATE TABLE "new_EvidenceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "proposition" TEXT,
    "description" TEXT,
    "source" TEXT,
    "sha256" TEXT,
    "documentId" TEXT,
    "sourcePage" TEXT,
    "quotedText" TEXT,
    "eventDate" DATETIME,
    "evidenceType" TEXT,
    "posture" TEXT,
    "evidentiaryStatus" TEXT,
    "authenticationStatus" TEXT,
    "relatedWitnessId" TEXT,
    "exhibitStatus" TEXT NOT NULL DEFAULT 'not-selected',
    "exhibitLabel" TEXT,
    "privilegeStatus" TEXT,
    "anticipatedObjections" TEXT,
    "objectionResponse" TEXT,
    "authenticationNote" TEXT,
    "foundationNote" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "creationSource" TEXT,
    "aiProvider" TEXT,
    "confidence" REAL,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT NOT NULL DEFAULT 'none',
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvidenceItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EvidenceItem_relatedWitnessId_fkey" FOREIGN KEY ("relatedWitnessId") REFERENCES "Witness" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EvidenceItem" ("authenticationNote", "caseId", "confidence", "createdAt", "description", "documentId", "foundationNote", "id", "sha256", "source", "title", "verificationStatus") SELECT "authenticationNote", "caseId", "confidence", "createdAt", "description", "documentId", "foundationNote", "id", "sha256", "source", "title", "verificationStatus" FROM "EvidenceItem";
DROP TABLE "EvidenceItem";
ALTER TABLE "new_EvidenceItem" RENAME TO "EvidenceItem";
CREATE TABLE "new_LegalIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'substantive',
    "issueType" TEXT NOT NULL DEFAULT 'claim',
    "description" TEXT,
    "summary" TEXT,
    "assertingParty" TEXT,
    "opposingParty" TEXT,
    "jurisdiction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'asserted',
    "posture" TEXT,
    "burdenHolder" TEXT,
    "standard" TEXT,
    "requestedRelief" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "missingProof" TEXT,
    "opposingPosition" TEXT,
    "assessment" TEXT,
    "createdBy" TEXT,
    "aiProvider" TEXT,
    "confidence" REAL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalIssue_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LegalIssue" ("caseId", "category", "createdAt", "id", "summary", "title") SELECT "caseId", "category", "createdAt", "id", "summary", "title" FROM "LegalIssue";
DROP TABLE "LegalIssue";
ALTER TABLE "new_LegalIssue" RENAME TO "LegalIssue";
CREATE TABLE "new_Witness" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'fact',
    "role" TEXT,
    "party" TEXT,
    "employer" TEXT,
    "contact" TEXT,
    "expectedTestimony" TEXT,
    "relevantIssues" TEXT,
    "credibilityNotes" TEXT,
    "authenticationRole" TEXT,
    "subpoenaStatus" TEXT,
    "depositionStatus" TEXT,
    "summary" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Witness_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Witness" ("caseId", "createdAt", "id", "kind", "name", "summary") SELECT "caseId", "createdAt", "id", "kind", "name", "summary" FROM "Witness";
DROP TABLE "Witness";
ALTER TABLE "new_Witness" RENAME TO "Witness";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceLegalIssueLink_evidenceId_legalIssueId_elementId_relation_key" ON "EvidenceLegalIssueLink"("evidenceId", "legalIssueId", "elementId", "relation");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceDiscoveryLink_evidenceId_discoveryRequestId_key" ON "EvidenceDiscoveryLink"("evidenceId", "discoveryRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceTimelineLink_evidenceId_timelineEventId_key" ON "EvidenceTimelineLink"("evidenceId", "timelineEventId");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceMotionLink_evidenceId_motionId_key" ON "EvidenceMotionLink"("evidenceId", "motionId");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceDocumentLink_evidenceId_documentId_key" ON "EvidenceDocumentLink"("evidenceId", "documentId");
