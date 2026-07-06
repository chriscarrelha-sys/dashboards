// Core domain model for the Institutional Sales Operating System (ISOS).
// Every advisor is a single unified profile; everything else references it.

export type Custodian =
  | "Schwab"
  | "Fidelity"
  | "Pershing"
  | "LPL"
  | "Raymond James"
  | "TD"
  | "Other";

export type FirmType = "RIA" | "Broker-Dealer" | "Hybrid RIA" | "Family Office" | "Bank Trust";

export type InterestLevel = "Cold" | "Warm" | "Hot";

/** How strong a fit the advisor is for market-neutral / alternatives. */
export interface FitSignals {
  altsAllocationPct: number; // current % in alternatives
  usesMarketNeutral: boolean;
  convertibleArbInterest: InterestLevel;
  correlationSensitivity: InterestLevel; // cares about portfolio correlation
  taxSensitivity: InterestLevel;
}

export interface Engagement {
  emailsSent: number;
  opens: number;
  clicks: number;
  replies: number;
  meetings: number;
  whitepaperDownloads: number;
  lastOpenedAt?: string; // ISO date
}

export interface Advisor {
  id: string;
  name: string;
  title: string;
  firm: string;
  firmType: FirmType;
  crd?: string; // SEC/FINRA CRD number
  custodian: Custodian;
  aum: number; // firm AUM in USD
  city: string;
  state: string;
  email: string;
  linkedin?: string;
  website?: string;

  strategiesUsed: string[];
  fit: FitSignals;

  // Human / relationship layer
  personalNotes: string[]; // e.g. "Georgia alum", "plays golf at East Lake"
  relationshipScore: number; // 0-100, computed but stored for override
  tags: string[];

  // Research (populated by the AI Research Engine)
  research?: ResearchReport;

  // Pipeline
  stage: PipelineStage;
  currentSequenceId?: string;
  currentStepIndex?: number; // position within the sequence
  lastContactAt?: string;
  nextFollowUpAt?: string;

  engagement: Engagement;
}

export type PipelineStage =
  | "New"
  | "Researching"
  | "Engaged"
  | "Meeting Set"
  | "Opportunity"
  | "Won"
  | "Dormant";

export interface ResearchSource {
  label: string;
  url?: string;
}

export interface ResearchReport {
  generatedAt: string;
  summary: string;
  investmentPhilosophy: string;
  productFit: string;
  conversationStarters: string[];
  likelyObjections: string[];
  recommendedAngle: string;
  confidence: number; // 0-100
  sources: ResearchSource[];
}

// ── Sequences / Campaigns ───────────────────────────────────────────────
// Workflows are the primary abstraction; an email sequence is one kind.

export type StepChannel =
  | "email"
  | "linkedin"
  | "call"
  | "voicemail"
  | "task"
  | "research"
  | "meeting";

export interface SequenceStep {
  id: string;
  dayOffset: number; // day relative to enrollment
  channel: StepChannel;
  title: string;
  description: string;
  requiresApproval: boolean;
}

export interface Sequence {
  id: string;
  name: string;
  description: string;
  audience: string; // e.g. "RIAs, $300M–$700M, Schwab, alts-curious"
  steps: SequenceStep[];
  active: boolean;
  enrolledCount: number;
}

// ── Activity timeline ───────────────────────────────────────────────────

export type ActivityType =
  | "email_sent"
  | "email_opened"
  | "email_replied"
  | "call"
  | "meeting"
  | "note"
  | "research"
  | "download"
  | "stage_change";

export interface Activity {
  id: string;
  advisorId: string;
  type: ActivityType;
  at: string; // ISO date
  summary: string;
  detail?: string;
}

// ── AI content ──────────────────────────────────────────────────────────

export type DraftTone = "warm" | "professional" | "technical" | "concise";

export interface DraftRequest {
  advisorId: string;
  stepTitle: string; // e.g. "Email 3 — Correlation follow-up"
  tone: DraftTone;
  emphasis: string[]; // e.g. ["convertible arbitrage", "tax efficiency", "golf"]
  instructions?: string;
}

export interface Draft {
  subject: string;
  body: string;
  model: string; // which engine produced it
  rationale: string; // why the AI chose this angle
}
