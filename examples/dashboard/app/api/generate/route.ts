import { streamText } from "ai";
import { generateSystemPrompt } from "@json-render/core";
import { dashboardCatalog } from "@/lib/catalog";

export const maxDuration = 30;

const SYSTEM_PROMPT = generateSystemPrompt(dashboardCatalog, {
  system:
    "You are a dashboard widget generator that outputs JSONL (JSON Lines) patches.",
  customRules: [
    "Children array contains STRING KEYS, not nested objects",
    'DATA BINDING: Use valuePath for single values (e.g., "/analytics/revenue"), dataPath for arrays',
  ],
  includeVisibility: false,
  includeValidation: false,
});

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

export async function POST(req: Request) {
  const { prompt, context } = await req.json();

  let fullPrompt = prompt;

  // Add data context
  if (context?.data) {
    fullPrompt += `\n\nAVAILABLE DATA:\n${JSON.stringify(context.data, null, 2)}`;
  }

  const result = streamText({
    model: process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL,
    system: SYSTEM_PROMPT,
    prompt: fullPrompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
