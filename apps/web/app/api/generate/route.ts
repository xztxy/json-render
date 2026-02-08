import { streamText } from "ai";
import { headers } from "next/headers";
import { buildUserPrompt } from "@json-render/core";
import { minuteRateLimit, dailyRateLimit } from "@/lib/rate-limit";
import { playgroundCatalog } from "@/lib/catalog";

export const maxDuration = 30;

const SYSTEM_PROMPT = playgroundCatalog.prompt({
  customRules: [
    "For forms: Card should be the root element, not wrapped in a centering Stack",
    "NEVER use viewport height classes (min-h-screen, h-screen) - breaks the container",
    "NEVER use page background colors (bg-gray-50) - container has its own background",
  ],
});

const MAX_PROMPT_LENGTH = 500;
const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

export async function POST(req: Request) {
  // Get client IP for rate limiting
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";

  // Check rate limits (minute and daily)
  const [minuteResult, dailyResult] = await Promise.all([
    minuteRateLimit.limit(ip),
    dailyRateLimit.limit(ip),
  ]);

  if (!minuteResult.success || !dailyResult.success) {
    const isMinuteLimit = !minuteResult.success;
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: isMinuteLimit
          ? "Too many requests. Please wait a moment before trying again."
          : "Daily limit reached. Please try again tomorrow.",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { prompt, context } = await req.json();

  const userPrompt = buildUserPrompt({
    prompt,
    currentSpec: context?.previousSpec,
    maxPromptLength: MAX_PROMPT_LENGTH,
  });

  const result = streamText({
    model: process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
