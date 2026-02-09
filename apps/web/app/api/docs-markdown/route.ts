import { readFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

/**
 * Converts raw MDX content to clean Markdown suitable for AI agents.
 *
 * Transformations:
 * - Remove `export` statements (metadata, etc.)
 * - Remove `import` statements
 * - Replace `<PackageInstall packages="x y" />` with a fenced bash code block
 * - Strip standalone JSX callout divs (the amber concept boxes)
 * - Pass everything else through as-is (already valid Markdown)
 */
function mdxToCleanMarkdown(raw: string): string {
  const lines = raw.split("\n");
  const out: string[] = [];
  let inJsxBlock = false;
  let jsxDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip export and import statements
    if (trimmed.startsWith("export ") || trimmed.startsWith("import ")) {
      continue;
    }

    // Handle PackageInstall component
    const pkgMatch = trimmed.match(
      /<PackageInstall\s+packages="([^"]+)"\s*\/>/,
    );
    if (pkgMatch) {
      const packages = pkgMatch[1];
      out.push("```bash");
      out.push(`pnpm add ${packages}`);
      out.push("```");
      out.push("");
      continue;
    }

    // Track JSX blocks (like the callout divs) and skip them
    if (
      !inJsxBlock &&
      trimmed.startsWith("<div ") &&
      trimmed.includes("className=")
    ) {
      inJsxBlock = true;
      jsxDepth = 1;
      continue;
    }

    if (inJsxBlock) {
      // Count opening/closing div tags to handle nesting
      const opens = (line.match(/<div[\s>]/g) || []).length;
      const closes = (line.match(/<\/div>/g) || []).length;
      jsxDepth += opens - closes;
      if (jsxDepth <= 0) {
        inJsxBlock = false;
        jsxDepth = 0;
      }
      continue;
    }

    out.push(line);
  }

  // Clean up leading blank lines
  let result = out.join("\n");
  result = result.replace(/^\n+/, "\n").trim();
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const docPath = searchParams.get("path");

  if (!docPath) {
    return NextResponse.json(
      { error: "Missing ?path= parameter" },
      { status: 400 },
    );
  }

  // Sanitize path: only allow docs paths, no traversal
  const normalized = docPath
    .replace(/^\//, "")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9/-]/g, "");

  if (!normalized.startsWith("docs")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Map URL path to file path
  // /docs -> /app/(main)/docs/page.mdx
  // /docs/installation -> /app/(main)/docs/installation/page.mdx
  const slug = normalized === "docs" ? "" : normalized.replace(/^docs\/?/, "");
  const filePath = slug
    ? join(
        process.cwd(),
        "app",
        "(main)",
        "docs",
        ...slug.split("/"),
        "page.mdx",
      )
    : join(process.cwd(), "app", "(main)", "docs", "page.mdx");

  try {
    const raw = await readFile(filePath, "utf-8");
    const markdown = mdxToCleanMarkdown(raw);

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
}
