import React from "react";
import ReactPDF from "@react-pdf/renderer";
import type { Spec } from "@json-render/core";
import { Renderer, JSONUIProvider, type ComponentRegistry } from "./renderer";
import { standardComponents } from "./components/standard";

export interface RenderOptions {
  /** Custom component registry. Merged with standard components. */
  registry?: ComponentRegistry;
  /** Whether to include standard PDF components (default: true) */
  includeStandard?: boolean;
  /** Initial state for dynamic prop resolution */
  state?: Record<string, unknown>;
  /** Action handlers */
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
}

function buildDocument(
  spec: Spec,
  options: RenderOptions = {},
): React.ReactElement {
  const {
    registry: customRegistry,
    includeStandard = true,
    state,
    handlers,
  } = options;

  const mergedRegistry: ComponentRegistry = {
    ...(includeStandard ? standardComponents : {}),
    ...customRegistry,
  };

  return (
    <JSONUIProvider initialState={state ?? spec.state} handlers={handlers}>
      <Renderer spec={spec} registry={mergedRegistry} includeStandard={false} />
    </JSONUIProvider>
  );
}

/**
 * Render a json-render spec to a PDF buffer.
 *
 * @example
 * ```typescript
 * import { renderToBuffer } from "@json-render/react-pdf";
 *
 * const buffer = await renderToBuffer(spec);
 * fs.writeFileSync("output.pdf", buffer);
 * ```
 */
export async function renderToBuffer(
  spec: Spec,
  options?: RenderOptions,
): Promise<Uint8Array> {
  const document = buildDocument(spec, options);
  return ReactPDF.renderToBuffer(document as any);
}

/**
 * Render a json-render spec to a PDF readable stream.
 *
 * @example
 * ```typescript
 * import { renderToStream } from "@json-render/react-pdf";
 *
 * const stream = await renderToStream(spec);
 * stream.pipe(res);
 * ```
 */
export async function renderToStream(
  spec: Spec,
  options?: RenderOptions,
): Promise<ReadableStream> {
  const document = buildDocument(spec, options);
  return ReactPDF.renderToStream(document as any);
}

/**
 * Render a json-render spec to a PDF file on disk.
 *
 * @example
 * ```typescript
 * import { renderToFile } from "@json-render/react-pdf";
 *
 * await renderToFile(spec, "./output.pdf");
 * ```
 */
export async function renderToFile(
  spec: Spec,
  filePath: string,
  options?: RenderOptions,
): Promise<void> {
  const document = buildDocument(spec, options);
  await ReactPDF.render(document as any, filePath);
}
