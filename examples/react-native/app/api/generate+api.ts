import { streamText } from "ai";
import { createGatewayProvider } from "@ai-sdk/gateway";
import { catalog, customRules } from "../../lib/render/catalog";

const SYSTEM_PROMPT = catalog.prompt({ customRules });

const MAX_PROMPT_LENGTH = 500;
const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

// Explicitly pass the API key since Expo's Metro bundler only inlines
// process.env values that are directly referenced in application code.
// The default `gateway` singleton reads process.env.AI_GATEWAY_API_KEY
// internally, which Metro won't bundle.
const gateway = createGatewayProvider({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export async function POST(req: Request) {
  console.log("[API] POST /api/generate called");
  console.log("[API] API key present:", !!process.env.AI_GATEWAY_API_KEY);
  console.log("[API] Model:", process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL);

  try {
    const { prompt, context } = await req.json();
    console.log("[API] prompt:", prompt);

    const sanitizedPrompt = String(prompt || "").slice(0, MAX_PROMPT_LENGTH);
    const previousSpec = context?.previousSpec;

    let fullPrompt = sanitizedPrompt;

    // Add context state if provided
    if (context?.state) {
      fullPrompt += `\n\nAVAILABLE STATE:\n${JSON.stringify(context.state, null, 2)}`;
    }

    // Add current spec if refining
    if (
      previousSpec &&
      previousSpec.root &&
      Object.keys(previousSpec.elements || {}).length > 0
    ) {
      fullPrompt = `CURRENT UI STATE (already loaded, DO NOT recreate existing elements):
${JSON.stringify(previousSpec, null, 2)}

USER REQUEST: ${sanitizedPrompt}

IMPORTANT: The current UI is already loaded. Output ONLY the patches needed to make the requested change:
- To add a new element: {"op":"add","path":"/elements/new-key","value":{...}}
- To modify an existing element: {"op":"replace","path":"/elements/existing-key","value":{...}}
- To remove an element: {"op":"remove","path":"/elements/old-key"}
- To update the root: {"op":"replace","path":"/root","value":"new-root-key"}
- To add children: update the parent element with new children array

DO NOT output patches for elements that don't need to change. Only output what's necessary for the requested modification.`;
    }

    const modelId = process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
    const model = gateway(modelId);

    console.log("[API] calling streamText with model:", modelId);
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt: fullPrompt,
      temperature: 0.7,
    });

    console.log("[API] returning text stream response");
    return result.toTextStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("API generate error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
