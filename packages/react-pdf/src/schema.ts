import { defineSchema } from "@json-render/core";

/**
 * The schema for @json-render/react-pdf
 *
 * Defines:
 * - Spec: A flat tree of elements with keys, types, props, and children references
 * - Catalog: Components with props schemas
 *
 * Reuses the same { root, elements } spec format as the React and React Native renderers.
 */
export const schema = defineSchema(
  (s) => ({
    spec: s.object({
      root: s.string(),
      elements: s.record(
        s.object({
          type: s.ref("catalog.components"),
          props: s.propsOf("catalog.components"),
          children: s.array(s.string()),
          visible: s.any(),
        }),
      ),
    }),

    catalog: s.object({
      components: s.map({
        props: s.zod(),
        slots: s.array(s.string()),
        description: s.string(),
        example: s.any(),
      }),
    }),
  }),
  {
    defaultRules: [
      "The root element MUST be a Document component. Its children MUST be Page components.",
      "Every Page must specify a size (e.g. 'A4', 'LETTER') and can set orientation, margins, and background color.",
      "Use Row for horizontal layouts and Column for vertical layouts. Both support gap, align, and justify props.",
      "Table columns must define header and optionally width and align. Rows is an array of string arrays matching the column count.",
      "All text content must use Heading or Text components. Raw strings are not supported.",
      "Image src must be a fully qualified URL or base64 data URI.",
      "PageNumber renders the current page number and total pages. Place it inside a Page.",
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist.",
    ],
  },
);

export type ReactPdfSchema = typeof schema;

export type ReactPdfSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;
