import { agent } from "@/lib/agent";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await agent.stream({ prompt });

  return result.toTextStreamResponse();
}
