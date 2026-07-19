-- CreateTable
CREATE TABLE "PricingVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CommercialPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "tierOrder" INTEGER NOT NULL DEFAULT 0,
    "badge" TEXT,
    "pricingVersion" TEXT NOT NULL DEFAULT '2026.1',
    "trialEligible" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlanPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planCode" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "cadence" TEXT NOT NULL DEFAULT 'standard',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripePriceId" TEXT,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "PlanEntitlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planCode" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "intValue" INTEGER,
    "boolValue" BOOLEAN,
    "textValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FeatureDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AccountSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "cadence" TEXT NOT NULL DEFAULT 'standard',
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "foundingMember" BOOLEAN NOT NULL DEFAULT false,
    "pricingVersion" TEXT NOT NULL DEFAULT '2026.1',
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "trialEndsAt" DATETIME,
    "scheduledPlanCode" TEXT,
    "scheduledInterval" TEXT,
    "cancelAt" DATETIME,
    "canceledAt" DATETIME,
    "restrictedAt" DATETIME,
    "readOnlyAt" DATETIME,
    "exportUntil" DATETIME,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SubscriptionStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FoundingMemberConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cap" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FoundingMemberGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "endedAt" DATETIME,
    "endedReason" TEXT
);

-- CreateTable
CREATE TABLE "TrialConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planCode" TEXT NOT NULL DEFAULT 'PRO',
    "days" INTEGER NOT NULL DEFAULT 7,
    "cardRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxCases" INTEGER NOT NULL DEFAULT 1,
    "maxDocuments" INTEGER NOT NULL DEFAULT 25,
    "maxAiActions" INTEGER NOT NULL DEFAULT 10,
    "maxBinders" INTEGER NOT NULL DEFAULT 1,
    "allowFolderMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "allowBulkImport" BOOLEAN NOT NULL DEFAULT false,
    "allowCaseWideReview" BOOLEAN NOT NULL DEFAULT false,
    "exportGraceDays" INTEGER NOT NULL DEFAULT 30,
    "onePerUser" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Trial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL DEFAULT 'PRO',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "configJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TrialUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "documentsUsed" INTEGER NOT NULL DEFAULT 0,
    "aiActionsUsed" INTEGER NOT NULL DEFAULT 0,
    "bindersUsed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AddOnProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'one-time',
    "grantAmount" INTEGER,
    "grantUnit" TEXT,
    "rolloverMonths" INTEGER,
    "quoteRequired" BOOLEAN NOT NULL DEFAULT false,
    "stripePriceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AccountAddOn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "addOnCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "stripeItemId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME
);

-- CreateTable
CREATE TABLE "UsageMeter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "includedLimit" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UsageLedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "meterKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER,
    "refType" TEXT,
    "refId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PurchasedActionGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "granted" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'addon',
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "AIActionDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minCharge" INTEGER NOT NULL DEFAULT 1,
    "maxCharge" INTEGER NOT NULL DEFAULT 1,
    "pageWeight" REAL NOT NULL DEFAULT 0,
    "docCountWeight" REAL NOT NULL DEFAULT 0,
    "tokenWeight" REAL NOT NULL DEFAULT 0,
    "webResearchWeight" REAL NOT NULL DEFAULT 0,
    "premiumModelWeight" REAL NOT NULL DEFAULT 0,
    "cachedDiscount" REAL NOT NULL DEFAULT 0,
    "planAvailability" TEXT NOT NULL DEFAULT '["ESSENTIALS","PRO","COMMAND"]',
    "trialAvailable" BOOLEAN NOT NULL DEFAULT true,
    "manualApprovalThreshold" INTEGER NOT NULL DEFAULT 50,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AIProviderCostRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "caseId" TEXT,
    "actionCode" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "requestId" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "toolCalls" INTEGER NOT NULL DEFAULT 0,
    "searchCalls" INTEGER NOT NULL DEFAULT 0,
    "providerReportedCost" INTEGER,
    "calculatedCost" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "retry" BOOLEAN NOT NULL DEFAULT false,
    "fallbackProvider" TEXT,
    "actionsCharged" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProcessingUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "caseId" TEXT,
    "category" TEXT NOT NULL,
    "pages" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WorkflowUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "caseId" TEXT,
    "workflowCode" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StorageUsageSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "originalBytes" BIGINT NOT NULL DEFAULT 0,
    "derivativeBytes" BIGINT NOT NULL DEFAULT 0,
    "tempBytes" BIGINT NOT NULL DEFAULT 0,
    "backupBytes" BIGINT NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VendorPriceConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendor" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "sku" TEXT,
    "unitType" TEXT NOT NULL,
    "inputPerMillion" INTEGER,
    "cachedInputPerMillion" INTEGER,
    "outputPerMillion" INTEGER,
    "requestPrice" INTEGER,
    "searchCallPrice" INTEGER,
    "storagePerGbMonth" INTEGER,
    "transferPerGb" INTEGER,
    "ocrPagePrice" INTEGER,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "lastVerifiedAt" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CostBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planCode" TEXT NOT NULL,
    "aiBudget" INTEGER NOT NULL,
    "infraBudget" INTEGER NOT NULL,
    "supportBudget" INTEGER NOT NULL,
    "targetCogs" INTEGER NOT NULL,
    "minMarginBps" INTEGER NOT NULL DEFAULT 6000,
    "warnBps" INTEGER NOT NULL DEFAULT 7500,
    "interventionBps" INTEGER NOT NULL DEFAULT 10000,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "StripeFeeConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardRateBps" INTEGER NOT NULL DEFAULT 290,
    "cardFixed" INTEGER NOT NULL DEFAULT 30,
    "billingBps" INTEGER NOT NULL DEFAULT 70,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" DATETIME,
    "payload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CheckoutSessionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'mock',
    "status" TEXT NOT NULL DEFAULT 'created',
    "amount" INTEGER,
    "stripeSessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BillingPortalSessionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'mock',
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "amount" INTEGER,
    "feeAmount" INTEGER,
    "feeKind" TEXT,
    "detail" TEXT,
    "stripeRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "percentOff" INTEGER,
    "amountOff" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CommercialAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'user',
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingVersion_version_key" ON "PricingVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialPlan_code_key" ON "CommercialPlan"("code");

-- CreateIndex
CREATE INDEX "CommercialPlan_pricingVersion_idx" ON "CommercialPlan"("pricingVersion");

-- CreateIndex
CREATE INDEX "PlanPrice_planCode_idx" ON "PlanPrice"("planCode");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPrice_planCode_interval_cadence_effectiveFrom_key" ON "PlanPrice"("planCode", "interval", "cadence", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PlanEntitlement_planCode_idx" ON "PlanEntitlement"("planCode");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEntitlement_planCode_key_key" ON "PlanEntitlement"("planCode", "key");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureDefinition_code_key" ON "FeatureDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSubscription_userId_key" ON "AccountSubscription"("userId");

-- CreateIndex
CREATE INDEX "AccountSubscription_planCode_idx" ON "AccountSubscription"("planCode");

-- CreateIndex
CREATE INDEX "AccountSubscription_status_idx" ON "AccountSubscription"("status");

-- CreateIndex
CREATE INDEX "SubscriptionStatusHistory_userId_idx" ON "SubscriptionStatusHistory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FoundingMemberGrant_userId_key" ON "FoundingMemberGrant"("userId");

-- CreateIndex
CREATE INDEX "FoundingMemberGrant_active_idx" ON "FoundingMemberGrant"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Trial_userId_key" ON "Trial"("userId");

-- CreateIndex
CREATE INDEX "Trial_status_idx" ON "Trial"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrialUsage_userId_key" ON "TrialUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AddOnProduct_code_key" ON "AddOnProduct"("code");

-- CreateIndex
CREATE INDEX "AccountAddOn_userId_idx" ON "AccountAddOn"("userId");

-- CreateIndex
CREATE INDEX "UsageMeter_userId_key_idx" ON "UsageMeter"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "UsageMeter_userId_key_periodStart_key" ON "UsageMeter"("userId", "key", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageLedgerEntry_idempotencyKey_key" ON "UsageLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "UsageLedgerEntry_userId_meterKey_idx" ON "UsageLedgerEntry"("userId", "meterKey");

-- CreateIndex
CREATE INDEX "PurchasedActionGrant_userId_active_idx" ON "PurchasedActionGrant"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AIActionDefinition_code_key" ON "AIActionDefinition"("code");

-- CreateIndex
CREATE INDEX "AIProviderCostRecord_userId_idx" ON "AIProviderCostRecord"("userId");

-- CreateIndex
CREATE INDEX "AIProviderCostRecord_provider_idx" ON "AIProviderCostRecord"("provider");

-- CreateIndex
CREATE INDEX "AIProviderCostRecord_createdAt_idx" ON "AIProviderCostRecord"("createdAt");

-- CreateIndex
CREATE INDEX "ProcessingUsageRecord_userId_idx" ON "ProcessingUsageRecord"("userId");

-- CreateIndex
CREATE INDEX "WorkflowUsageRecord_userId_idx" ON "WorkflowUsageRecord"("userId");

-- CreateIndex
CREATE INDEX "StorageUsageSnapshot_userId_idx" ON "StorageUsageSnapshot"("userId");

-- CreateIndex
CREATE INDEX "VendorPriceConfiguration_vendor_service_idx" ON "VendorPriceConfiguration"("vendor", "service");

-- CreateIndex
CREATE UNIQUE INDEX "CostBudget_planCode_effectiveFrom_key" ON "CostBudget"("planCode", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEvent_eventId_key" ON "StripeWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "CheckoutSessionRecord_userId_idx" ON "CheckoutSessionRecord"("userId");

-- CreateIndex
CREATE INDEX "BillingPortalSessionRecord_userId_idx" ON "BillingPortalSessionRecord"("userId");

-- CreateIndex
CREATE INDEX "BillingEvent_userId_idx" ON "BillingEvent"("userId");

-- CreateIndex
CREATE INDEX "BillingEvent_type_idx" ON "BillingEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "CommercialAuditLog_userId_idx" ON "CommercialAuditLog"("userId");

-- CreateIndex
CREATE INDEX "CommercialAuditLog_action_idx" ON "CommercialAuditLog"("action");
