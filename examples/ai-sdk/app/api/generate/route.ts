import { agent } from "@/lib/agent";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { parseSpecStreamLine } from "@json-render/core";

export const maxDuration = 60;

/**
 * Creates a TransformStream that intercepts text-delta chunks from the
 * AI SDK's UI message stream, buffers them line-by-line, and classifies
 * each complete line as either:
 *
 * - Plain text -> re-emitted as text-delta
 * - JSONL patch -> emitted as a data-jsonrender part
 *
 * All non-text chunks (tool events, step markers, etc.) pass through unchanged.
 */
function createJsonRenderTransform(): TransformStream<
  UIMessageChunk,
  UIMessageChunk
> {
  let lineBuffer = "";
  let currentTextId = "";

  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      switch (chunk.type) {
        case "text-start": {
          currentTextId = chunk.id;
          controller.enqueue(chunk);
          break;
        }

        case "text-delta": {
          currentTextId = chunk.id;
          lineBuffer += chunk.delta;

          // Process all complete lines in the buffer
          const lines = lineBuffer.split("\n");
          // The last element is the incomplete line (keep in buffer)
          lineBuffer = lines.pop() ?? "";

          for (const line of lines) {
            emitLine(line, currentTextId, controller);
          }
          break;
        }

        case "text-end": {
          // Flush any remaining buffered content
          if (lineBuffer) {
            emitLine(lineBuffer, currentTextId, controller);
            lineBuffer = "";
          }
          controller.enqueue(chunk);
          break;
        }

        default: {
          // Pass through all non-text chunks unchanged
          controller.enqueue(chunk);
          break;
        }
      }
    },

    flush(controller) {
      // Flush any remaining content on stream close
      if (lineBuffer) {
        emitLine(lineBuffer, currentTextId, controller);
        lineBuffer = "";
      }
    },
  });
}

/**
 * Classify a single complete line and enqueue the appropriate chunk.
 */
function emitLine(
  line: string,
  textId: string,
  controller: TransformStreamDefaultController<UIMessageChunk>,
): void {
  const trimmed = line.trim();

  // Empty lines are meaningful for markdown (paragraph breaks) — pass them through
  if (!trimmed) {
    controller.enqueue({
      type: "text-delta",
      id: textId,
      delta: "\n",
    });
    return;
  }

  const patch = parseSpecStreamLine(trimmed);
  if (patch) {
    // JSONL patch line -> data-jsonrender part
    controller.enqueue({
      type: "data-jsonrender",
      data: patch,
    });
  } else {
    // Plain text line -> re-emit as text-delta (with newline restored)
    controller.enqueue({
      type: "text-delta",
      id: textId,
      delta: line + "\n",
    });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const uiMessages: UIMessage[] = body.messages;

  if (!uiMessages || !Array.isArray(uiMessages) || uiMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Convert UIMessages (parts-based) to ModelMessages (content-based) for the agent
  const modelMessages = await convertToModelMessages(uiMessages);

  const result = await agent.stream({ messages: modelMessages });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.merge(
        result.toUIMessageStream().pipeThrough(createJsonRenderTransform()),
      );
    },
  });

  return createUIMessageStreamResponse({ stream });
}
