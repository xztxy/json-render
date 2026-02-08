"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useUIStream, type TokenUsage } from "@json-render/react";
import type { Spec } from "@json-render/core";
import { collectUsedComponents, serializeProps } from "@json-render/codegen";
import { toast } from "sonner";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { CodeBlock } from "./code-block";
import { CopyButton } from "./copy-button";
import { Toaster } from "./ui/sonner";
import { Header } from "./header";
import { PlaygroundRenderer } from "@/lib/renderer";
import { playgroundCatalog } from "@/lib/catalog";

type Tab = "json" | "stream" | "catalog";
type RenderView = "preview" | "code";
type MobilePane = "chat" | "code" | "preview";

interface Version {
  id: string;
  prompt: string;
  tree: Spec | null;
  status: "generating" | "complete" | "error";
  usage: TokenUsage | null;
  rawLines: string[];
}

const EXAMPLE_PROMPTS = [
  "Create a login form",
  "Build a pricing page",
  "Design a user profile card",
  "Make a contact form",
];

export function Playground() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("json");
  const [catalogSection, setCatalogSection] = useState<
    "components" | "actions"
  >("components");
  const [renderView, setRenderView] = useState<RenderView>("preview");
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const versionsEndRef = useRef<HTMLDivElement>(null);

  // Track the currently generating version ID
  const generatingVersionIdRef = useRef<string | null>(null);

  // Track the current tree for use as previousSpec in next generation
  const currentTreeRef = useRef<Spec | null>(null);

  const {
    spec: apiSpec,
    isStreaming,
    usage: streamUsage,
    rawLines: streamRawLines,
    send,
    clear,
  } = useUIStream({
    api: "/api/generate",
    onError: (err: Error) => {
      console.error("Generation error:", err);
      toast.error(err.message || "Generation failed. Please try again.");
      // Mark the version as errored
      if (generatingVersionIdRef.current) {
        const erroredVersionId = generatingVersionIdRef.current;
        setVersions((prev) =>
          prev.map((v) =>
            v.id === erroredVersionId ? { ...v, status: "error" as const } : v,
          ),
        );
        generatingVersionIdRef.current = null;
      }
    },
  } as Parameters<typeof useUIStream>[0]);

  // Get the selected version
  const selectedVersion = versions.find((v) => v.id === selectedVersionId);

  // Determine which tree to display:
  // - If streaming and selected version is the generating one, show apiSpec
  // - Otherwise show the selected version's tree
  const isSelectedVersionGenerating =
    selectedVersionId === generatingVersionIdRef.current && isStreaming;
  const hasValidApiTree =
    apiSpec && apiSpec.root && Object.keys(apiSpec.elements).length > 0;

  const currentTree =
    isSelectedVersionGenerating && hasValidApiTree
      ? apiSpec
      : (selectedVersion?.tree ??
        (isSelectedVersionGenerating ? apiSpec : null));

  // Raw JSONL lines: live from stream during generation, or stored per version
  const currentRawLines = isSelectedVersionGenerating
    ? streamRawLines
    : (selectedVersion?.rawLines ?? []);

  // Keep the ref updated with the current tree for use in handleSubmit
  if (
    currentTree &&
    currentTree.root &&
    Object.keys(currentTree.elements).length > 0
  ) {
    currentTreeRef.current = currentTree;
  }

  // Scroll to bottom when versions change
  useEffect(() => {
    versionsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [versions]);

  // Update version when streaming completes
  useEffect(() => {
    if (
      !isStreaming &&
      apiSpec &&
      apiSpec.root &&
      generatingVersionIdRef.current
    ) {
      const completedVersionId = generatingVersionIdRef.current;
      setVersions((prev) =>
        prev.map((v) =>
          v.id === completedVersionId
            ? {
                ...v,
                tree: apiSpec,
                status: "complete" as const,
                usage: streamUsage,
                rawLines: streamRawLines,
              }
            : v,
        ),
      );
      generatingVersionIdRef.current = null;
    }
  }, [isStreaming, apiSpec, streamUsage, streamRawLines]);

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    const newVersionId = Date.now().toString();
    const newVersion: Version = {
      id: newVersionId,
      prompt: inputValue.trim(),
      tree: null,
      status: "generating",
      usage: null,
      rawLines: [],
    };

    generatingVersionIdRef.current = newVersionId;
    setVersions((prev) => [...prev, newVersion]);
    setSelectedVersionId(newVersionId);
    setInputValue("");

    // Pass the current tree as context so the API can iterate on it
    await send(inputValue.trim(), { previousSpec: currentTreeRef.current });
  }, [inputValue, isStreaming, send]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const jsonCode = currentTree
    ? JSON.stringify(currentTree, null, 2)
    : "// waiting...";

  const generatedCode = useMemo(() => {
    if (!currentTree || !currentTree.root) {
      return "// Generate a UI to see the code";
    }

    const tree = currentTree;
    const components = collectUsedComponents(tree);

    function generateJSX(key: string, indent: number): string {
      const element = tree.elements[key];
      if (!element) return "";

      const spaces = "  ".repeat(indent);
      const componentName = element.type;

      const propsObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(element.props)) {
        if (v !== null && v !== undefined) {
          propsObj[k] = v;
        }
      }

      const propsStr = serializeProps(propsObj);
      const hasChildren = element.children && element.children.length > 0;

      if (!hasChildren) {
        return propsStr
          ? `${spaces}<${componentName} ${propsStr} />`
          : `${spaces}<${componentName} />`;
      }

      const lines: string[] = [];
      lines.push(
        propsStr
          ? `${spaces}<${componentName} ${propsStr}>`
          : `${spaces}<${componentName}>`,
      );

      for (const childKey of element.children!) {
        lines.push(generateJSX(childKey, indent + 1));
      }

      lines.push(`${spaces}</${componentName}>`);
      return lines.join("\n");
    }

    const jsx = generateJSX(tree.root, 2);
    const imports = Array.from(components).sort().join(", ");

    return `"use client";

import { ${imports} } from "@/components/ui";

export default function Page() {
  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
${jsx}
    </div>
  );
}`;
  }, [currentTree]);

  // Chat pane content
  const chatPane = (
    <div className="h-full flex flex-col border-t border-border">
      <div className="border-b border-border px-3 h-9 flex items-center">
        <span className="text-xs font-mono text-muted-foreground">
          versions
        </span>
      </div>
      <div
        className={`flex-1 p-2 min-h-0 ${versions.length > 0 ? "overflow-y-auto space-y-1" : "flex"}`}
      >
        {versions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm text-muted-foreground mb-4">
              Describe what you want to build, then iterate on it.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInputValue(prompt);
                    setTimeout(() => {
                      if (inputRef.current) {
                        inputRef.current.focus();
                        inputRef.current.setSelectionRange(
                          prompt.length,
                          prompt.length,
                        );
                      }
                    }, 0);
                  }}
                  className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          versions.map((version, index) => (
            <button
              key={version.id}
              onClick={() => setSelectedVersionId(version.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                selectedVersionId === version.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground/70 shrink-0">
                  v{index + 1}
                </span>
                <span className="truncate flex-1">{version.prompt}</span>
                {version.status === "generating" && (
                  <span className="text-xs text-muted-foreground shrink-0 animate-pulse">
                    ...
                  </span>
                )}
                {version.status === "error" && (
                  <span className="text-xs text-red-500 shrink-0">failed</span>
                )}
              </div>
              {version.usage && (
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {version.usage.promptTokens.toLocaleString()} in
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {version.usage.completionTokens.toLocaleString()} out
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {version.usage.totalTokens.toLocaleString()} total
                  </span>
                </div>
              )}
            </button>
          ))
        )}
        <div ref={versionsEndRef} />
      </div>
      <div
        className="border-t border-border p-3 cursor-text"
        onMouseDown={(e) => {
          // Focus textarea unless clicking a button or the textarea itself
          const target = e.target as HTMLElement;
          if (!target.closest("button") && target.tagName !== "TEXTAREA") {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe changes..."
          className="w-full bg-background text-base sm:text-sm resize-none outline-none placeholder:text-muted-foreground/50"
          rows={2}
        />
        <div className="flex justify-between items-center mt-2">
          {versions.length > 0 ? (
            <button
              onClick={() => {
                setVersions([]);
                setSelectedVersionId(null);
                clear();
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          ) : (
            <div />
          )}
          {isStreaming ? (
            <button
              onClick={() => clear()}
              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              aria-label="Stop"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
              >
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30"
              aria-label="Send"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Catalog data for the catalog tab
  const catalogData = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = playgroundCatalog.data as any;

    function extractFields(zodObj: unknown): { name: string; type: string }[] {
      if (!zodObj) return [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj = zodObj as any;
        // Zod v4: shape is a plain object; Zod v3: shape is via _def.shape()
        const shape =
          typeof obj.shape === "object"
            ? obj.shape
            : typeof obj._def?.shape === "function"
              ? obj._def.shape()
              : typeof obj._def?.shape === "object"
                ? obj._def.shape
                : null;
        if (!shape) return [];

        return Object.entries(shape).map(([name, schema]) => {
          let type = "unknown";
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const s = schema as any;
            const typeName: string =
              s?._zod?.def?.type ?? s?._def?.typeName ?? "";
            if (typeName.includes("string")) type = "string";
            else if (typeName.includes("number")) type = "number";
            else if (typeName.includes("boolean")) type = "boolean";
            else if (typeName.includes("array")) type = "array";
            else if (typeName.includes("enum")) {
              const values = s?._zod?.def?.values ?? s?._def?.values;
              type = Array.isArray(values) ? values.join(" | ") : "enum";
            } else if (typeName.includes("union")) type = "union";
            else if (typeName.includes("nullable")) {
              const inner = s?._zod?.def?.innerType ?? s?._def?.innerType;
              const innerName: string =
                inner?._zod?.def?.type ?? inner?._def?.typeName ?? "";
              if (innerName.includes("string")) type = "string?";
              else if (innerName.includes("number")) type = "number?";
              else if (innerName.includes("boolean")) type = "boolean?";
              else if (innerName.includes("array")) type = "array?";
              else if (innerName.includes("enum")) {
                const values = inner?._zod?.def?.values ?? inner?._def?.values;
                type = Array.isArray(values)
                  ? `(${values.join(" | ")})?`
                  : "enum?";
              } else type = "optional";
            }
          } catch {
            // ignore
          }
          return { name, type };
        });
      } catch {
        return [];
      }
    }

    const components = Object.entries(raw.components ?? {})
      .map(([name, def]: [string, any]) => ({
        // eslint-disable-line @typescript-eslint/no-explicit-any
        name,
        description: (def.description as string) ?? "",
        props: extractFields(def.props),
        slots: (def.slots as string[]) ?? [],
        events: (def.events as string[]) ?? [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const actions = Object.entries(raw.actions ?? {})
      .map(([name, def]: [string, any]) => ({
        // eslint-disable-line @typescript-eslint/no-explicit-any
        name,
        description: (def.description as string) ?? "",
        params: extractFields(def.params),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { components, actions };
  }, []);

  // Code pane content
  const copyText =
    activeTab === "stream"
      ? currentRawLines.join("\n")
      : activeTab === "json"
        ? jsonCode
        : "";

  const codePane = (
    <div className="h-full flex flex-col border-t border-border">
      <div className="border-b border-border px-3 h-9 flex items-center gap-3">
        {(["json", "stream", "catalog"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs font-mono transition-colors ${
              activeTab === tab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="flex-1" />
        {activeTab !== "catalog" && (
          <CopyButton text={copyText} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {activeTab === "catalog" ? (
          <div className="h-full flex flex-col text-sm">
            <div className="flex items-center gap-3 px-3 h-9 border-b border-border">
              {(
                [
                  {
                    key: "components",
                    label: `components (${catalogData.components.length})`,
                  },
                  {
                    key: "actions",
                    label: `actions (${catalogData.actions.length})`,
                  },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCatalogSection(key)}
                  className={`text-xs font-mono transition-colors ${
                    catalogSection === key
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-3">
              {catalogSection === "components" ? (
                <div className="space-y-3">
                  {catalogData.components.map((comp) => (
                    <div
                      key={comp.name}
                      className="pb-3 border-b border-border last:border-b-0"
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-mono font-medium text-foreground">
                          {comp.name}
                        </span>
                        {comp.slots.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            slots: {comp.slots.join(", ")}
                          </span>
                        )}
                      </div>
                      {comp.description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {comp.description}
                        </p>
                      )}
                      {comp.props.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {comp.props.map((p) => (
                            <span
                              key={p.name}
                              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400"
                            >
                              {p.name}
                              <span className="text-green-700/50 dark:text-green-400/50">
                                : {p.type}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                      {comp.events.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {comp.events.map((e) => (
                            <span
                              key={e}
                              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            >
                              on.{e}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {catalogData.actions.map((action) => (
                    <div
                      key={action.name}
                      className="pb-3 border-b border-border last:border-b-0"
                    >
                      <span className="font-mono font-medium text-foreground">
                        {action.name}
                      </span>
                      {action.description && (
                        <p className="text-xs text-muted-foreground mt-1 mb-2">
                          {action.description}
                        </p>
                      )}
                      {action.params.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {action.params.map((p) => (
                            <span
                              key={p.name}
                              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400"
                            >
                              {p.name}
                              <span className="text-green-700/50 dark:text-green-400/50">
                                : {p.type}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "stream" ? (
          currentRawLines.length > 0 ? (
            <CodeBlock
              code={currentRawLines.join("\n")}
              lang="json"
              fillHeight
              hideCopyButton
            />
          ) : (
            <div className="text-muted-foreground/50 p-3 text-sm font-mono">
              {isStreaming ? "streaming..." : "// waiting for generation"}
            </div>
          )
        ) : (
          <CodeBlock code={jsonCode} lang="json" fillHeight hideCopyButton />
        )}
      </div>
    </div>
  );

  // Preview pane content
  const previewPane = (
    <div className="h-full flex flex-col border-t border-border">
      <div className="border-b border-border px-3 h-9 flex items-center gap-3">
        {(
          [
            { key: "preview", label: "preview" },
            { key: "code", label: "code" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setRenderView(key)}
            className={`text-xs font-mono transition-colors ${
              renderView === key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        {renderView === "code" && (
          <CopyButton text={generatedCode} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {renderView === "preview" ? (
          currentTree && currentTree.root ? (
            <div className="w-full min-h-full flex items-center justify-center p-6">
              <PlaygroundRenderer
                spec={currentTree}
                data={currentTree.state}
                loading={isStreaming}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
              {isStreaming
                ? "generating..."
                : "// enter a prompt to generate UI"}
            </div>
          )
        ) : (
          <CodeBlock
            code={generatedCode}
            lang="tsx"
            fillHeight
            hideCopyButton
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <Header />

      {/* Desktop: 3-pane resizable layout */}
      <div className="hidden lg:flex flex-1 min-h-0">
        <ResizablePanelGroup className="flex-1">
          <ResizablePanel defaultSize={25} minSize={15}>
            {chatPane}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={35} minSize={20}>
            {codePane}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40} minSize={20}>
            {previewPane}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Single pane with bottom tabs */}
      <div className="flex lg:hidden flex-col flex-1 min-h-0">
        {/* Panes - all in DOM, visibility controlled */}
        <div className="flex-1 min-h-0 relative">
          <div
            className={`absolute inset-0 ${mobilePane === "chat" ? "" : "invisible"}`}
          >
            {chatPane}
          </div>
          <div
            className={`absolute inset-0 ${mobilePane === "code" ? "" : "invisible"}`}
          >
            {codePane}
          </div>
          <div
            className={`absolute inset-0 ${mobilePane === "preview" ? "" : "invisible"}`}
          >
            {previewPane}
          </div>
        </div>

        {/* Bottom tab bar */}
        <div className="border-t border-border flex shrink-0">
          {(
            [
              {
                key: "chat",
                label: "Chat",
                icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
              },
              {
                key: "code",
                label: "Code",
                icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
              },
              {
                key: "preview",
                label: "Preview",
                icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
              },
            ] as const
          ).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setMobilePane(key)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
                mobilePane === key ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}
