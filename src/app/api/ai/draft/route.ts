import { NextResponse } from "next/server";
import { getAdvisor } from "@/lib/data/advisors";
import { localDraft } from "@/lib/ai/generator";
import { anthropicDraft } from "@/lib/ai/anthropic";
import type { DraftRequest } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<DraftRequest>;
  if (!body.advisorId) {
    return NextResponse.json({ error: "advisorId is required" }, { status: 400 });
  }
  const advisor = getAdvisor(body.advisorId);
  if (!advisor) {
    return NextResponse.json({ error: "advisor not found" }, { status: 404 });
  }

  const request: DraftRequest = {
    advisorId: body.advisorId,
    stepTitle: body.stepTitle || "Outreach email",
    tone: body.tone || "professional",
    emphasis: body.emphasis || [],
    instructions: body.instructions,
  };

  // Prefer a real model when configured; otherwise use the built-in engine.
  const draft = (await anthropicDraft(advisor, request)) ?? localDraft(advisor, request);
  return NextResponse.json({ draft });
}
