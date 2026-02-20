import { renderToBuffer } from "@json-render/react-pdf";
import { examples } from "@/lib/examples";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "invoice";
  const download = searchParams.get("download") === "1";

  const example = examples.find((e) => e.name === name);
  if (!example) {
    return new Response("Example not found", { status: 404 });
  }

  const buffer = await renderToBuffer(example.spec);

  const disposition = download
    ? `attachment; filename="${name}.pdf"`
    : `inline; filename="${name}.pdf"`;

  return new Response(buffer as unknown as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
    },
  });
}
