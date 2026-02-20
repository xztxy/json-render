import React from "react";
import {
  Document as PdfDocument,
  Page as PdfPage,
  View,
  Text as PdfText,
  Image as PdfImage,
  Link as PdfLink,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ComponentRenderProps } from "../renderer";
import type { ComponentRegistry } from "../renderer";

// =============================================================================
// Document Structure
// =============================================================================

function DocumentComponent({ element, children }: ComponentRenderProps) {
  const p = element.props as {
    title?: string | null;
    author?: string | null;
    subject?: string | null;
  };

  return (
    <PdfDocument
      title={p.title ?? undefined}
      author={p.author ?? undefined}
      subject={p.subject ?? undefined}
    >
      {children}
    </PdfDocument>
  );
}

function PageComponent({ element, children }: ComponentRenderProps) {
  const p = element.props as {
    size?: string | null;
    orientation?: "portrait" | "landscape" | null;
    marginTop?: number | null;
    marginBottom?: number | null;
    marginLeft?: number | null;
    marginRight?: number | null;
    backgroundColor?: string | null;
  };

  return (
    <PdfPage
      size={(p.size as any) ?? "A4"}
      orientation={p.orientation ?? "portrait"}
      style={{
        paddingTop: p.marginTop ?? 40,
        paddingBottom: p.marginBottom ?? 40,
        paddingLeft: p.marginLeft ?? 40,
        paddingRight: p.marginRight ?? 40,
        backgroundColor: p.backgroundColor ?? undefined,
        fontFamily: "Helvetica",
        fontSize: 12,
      }}
    >
      {children}
    </PdfPage>
  );
}

// =============================================================================
// Layout Components
// =============================================================================

function ViewComponent({ element, children }: ComponentRenderProps) {
  const p = element.props as {
    padding?: number | null;
    paddingTop?: number | null;
    paddingBottom?: number | null;
    paddingLeft?: number | null;
    paddingRight?: number | null;
    margin?: number | null;
    backgroundColor?: string | null;
    borderWidth?: number | null;
    borderColor?: string | null;
    borderRadius?: number | null;
    flex?: number | null;
  };

  return (
    <View
      style={{
        padding: p.padding ?? undefined,
        paddingTop: p.paddingTop ?? undefined,
        paddingBottom: p.paddingBottom ?? undefined,
        paddingLeft: p.paddingLeft ?? undefined,
        paddingRight: p.paddingRight ?? undefined,
        margin: p.margin ?? undefined,
        backgroundColor: p.backgroundColor ?? undefined,
        borderWidth: p.borderWidth ?? undefined,
        borderColor: p.borderColor ?? undefined,
        borderRadius: p.borderRadius ?? undefined,
        flex: p.flex ?? undefined,
      }}
    >
      {children}
    </View>
  );
}

function RowComponent({ element, children }: ComponentRenderProps) {
  const p = element.props as {
    gap?: number | null;
    alignItems?: string | null;
    justifyContent?: string | null;
    padding?: number | null;
    flex?: number | null;
    wrap?: boolean | null;
  };

  return (
    <View
      style={{
        flexDirection: "row",
        gap: p.gap ?? undefined,
        alignItems: (p.alignItems as any) ?? undefined,
        justifyContent: (p.justifyContent as any) ?? undefined,
        padding: p.padding ?? undefined,
        flex: p.flex ?? undefined,
        flexWrap: p.wrap ? "wrap" : undefined,
      }}
    >
      {children}
    </View>
  );
}

function ColumnComponent({ element, children }: ComponentRenderProps) {
  const p = element.props as {
    gap?: number | null;
    alignItems?: string | null;
    justifyContent?: string | null;
    padding?: number | null;
    flex?: number | null;
  };

  return (
    <View
      style={{
        flexDirection: "column",
        gap: p.gap ?? undefined,
        alignItems: (p.alignItems as any) ?? undefined,
        justifyContent: (p.justifyContent as any) ?? undefined,
        padding: p.padding ?? undefined,
        flex: p.flex ?? undefined,
      }}
    >
      {children}
    </View>
  );
}

// =============================================================================
// Content Components
// =============================================================================

const headingStyles = StyleSheet.create({
  h1: { fontSize: 24, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  h2: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  h3: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h4: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
});

function HeadingComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    text: string;
    level?: "h1" | "h2" | "h3" | "h4" | null;
    color?: string | null;
    align?: "left" | "center" | "right" | null;
  };

  const level = p.level ?? "h2";

  return (
    <PdfText
      style={[
        headingStyles[level],
        {
          color: p.color ?? undefined,
          textAlign: p.align ?? "left",
        },
      ]}
    >
      {p.text}
    </PdfText>
  );
}

function TextComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    text: string;
    fontSize?: number | null;
    color?: string | null;
    align?: "left" | "center" | "right" | null;
    fontWeight?: "normal" | "bold" | null;
    fontStyle?: "normal" | "italic" | null;
    lineHeight?: number | null;
  };

  return (
    <PdfText
      style={{
        fontSize: p.fontSize ?? 12,
        color: p.color ?? undefined,
        textAlign: p.align ?? "left",
        fontFamily:
          p.fontWeight === "bold" && p.fontStyle === "italic"
            ? "Helvetica-BoldOblique"
            : p.fontWeight === "bold"
              ? "Helvetica-Bold"
              : p.fontStyle === "italic"
                ? "Helvetica-Oblique"
                : "Helvetica",
        lineHeight: p.lineHeight ?? undefined,
      }}
    >
      {p.text}
    </PdfText>
  );
}

function ImageComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    src: string;
    width?: number | null;
    height?: number | null;
    objectFit?: "contain" | "cover" | "fill" | "none" | null;
  };

  return (
    <PdfImage
      src={p.src}
      style={{
        width: p.width ?? undefined,
        height: p.height ?? undefined,
        objectFit: p.objectFit ?? "contain",
      }}
    />
  );
}

function LinkComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    text: string;
    href: string;
    fontSize?: number | null;
    color?: string | null;
  };

  return (
    <PdfLink
      src={p.href}
      style={{
        fontSize: p.fontSize ?? 12,
        color: p.color ?? "#2563eb",
        textDecoration: "underline",
      }}
    >
      {p.text}
    </PdfLink>
  );
}

// =============================================================================
// Data Components
// =============================================================================

const tableStyles = StyleSheet.create({
  table: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    padding: 6,
  },
  headerCell: {
    padding: 6,
    fontFamily: "Helvetica-Bold",
  },
  bottomBorder: {
    borderBottomWidth: 1,
  },
});

function TableComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    columns: Array<{
      header: string;
      width?: string | null;
      align?: "left" | "center" | "right" | null;
    }>;
    rows: string[][];
    headerBackgroundColor?: string | null;
    headerTextColor?: string | null;
    borderColor?: string | null;
    fontSize?: number | null;
    striped?: boolean | null;
  };

  const borderColor = p.borderColor ?? "#e5e7eb";
  const fontSize = p.fontSize ?? 10;
  const defaultWidth = `${100 / p.columns.length}%`;

  return (
    <View style={tableStyles.table}>
      {/* Header */}
      <View
        style={[
          tableStyles.row,
          tableStyles.bottomBorder,
          {
            borderBottomColor: borderColor,
            backgroundColor: p.headerBackgroundColor ?? "#f3f4f6",
          },
        ]}
      >
        {p.columns.map((col, i) => (
          <View
            key={i}
            style={[
              tableStyles.headerCell,
              { width: col.width ?? defaultWidth },
            ]}
          >
            <PdfText
              style={{
                fontSize,
                color: p.headerTextColor ?? "#111827",
                textAlign: col.align ?? "left",
              }}
            >
              {col.header}
            </PdfText>
          </View>
        ))}
      </View>

      {/* Rows */}
      {p.rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            tableStyles.row,
            tableStyles.bottomBorder,
            {
              borderBottomColor: borderColor,
              backgroundColor:
                p.striped && rowIndex % 2 === 1 ? "#f9fafb" : undefined,
            },
          ]}
        >
          {p.columns.map((col, colIndex) => (
            <View
              key={colIndex}
              style={[tableStyles.cell, { width: col.width ?? defaultWidth }]}
            >
              <PdfText
                style={{
                  fontSize,
                  textAlign: col.align ?? "left",
                }}
              >
                {row[colIndex] ?? ""}
              </PdfText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function ListComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    items: string[];
    ordered?: boolean | null;
    fontSize?: number | null;
    color?: string | null;
    spacing?: number | null;
  };

  const fontSize = p.fontSize ?? 12;
  const spacing = p.spacing ?? 4;

  return (
    <View style={{ gap: spacing }}>
      {p.items.map((item, index) => (
        <View key={index} style={{ flexDirection: "row", gap: 6 }}>
          <PdfText
            style={{
              fontSize,
              color: p.color ?? undefined,
              width: p.ordered ? 20 : 12,
            }}
          >
            {p.ordered ? `${index + 1}.` : "\u2022"}
          </PdfText>
          <PdfText
            style={{
              fontSize,
              color: p.color ?? undefined,
              flex: 1,
            }}
          >
            {item}
          </PdfText>
        </View>
      ))}
    </View>
  );
}

// =============================================================================
// Decorative Components
// =============================================================================

function DividerComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    color?: string | null;
    thickness?: number | null;
    marginTop?: number | null;
    marginBottom?: number | null;
  };

  return (
    <View
      style={{
        borderBottomWidth: p.thickness ?? 1,
        borderBottomColor: p.color ?? "#e5e7eb",
        marginTop: p.marginTop ?? 8,
        marginBottom: p.marginBottom ?? 8,
      }}
    />
  );
}

function SpacerComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    height?: number | null;
  };

  return <View style={{ height: p.height ?? 20 }} />;
}

// =============================================================================
// Page-Level Components
// =============================================================================

function PageNumberComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    format?: string | null;
    fontSize?: number | null;
    color?: string | null;
    align?: "left" | "center" | "right" | null;
  };

  const format = p.format ?? "{pageNumber} / {totalPages}";

  return (
    <PdfText
      style={{
        fontSize: p.fontSize ?? 10,
        color: p.color ?? "#6b7280",
        textAlign: p.align ?? "center",
      }}
      render={({ pageNumber, totalPages }) =>
        format
          .replace("{pageNumber}", String(pageNumber))
          .replace("{totalPages}", String(totalPages))
      }
      fixed
    />
  );
}

// =============================================================================
// Registry
// =============================================================================

export const standardComponents: ComponentRegistry = {
  Document: DocumentComponent,
  Page: PageComponent,
  View: ViewComponent,
  Row: RowComponent,
  Column: ColumnComponent,
  Heading: HeadingComponent,
  Text: TextComponent,
  Image: ImageComponent,
  Link: LinkComponent,
  Table: TableComponent,
  List: ListComponent,
  Divider: DividerComponent,
  Spacer: SpacerComponent,
  PageNumber: PageNumberComponent,
};
