import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/vue/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        maxWidth: z.enum(["sm", "md", "lg", "xl"]).nullable().optional(),
        centered: z.boolean().nullable().optional(),
      }),
      slots: ["default"],
      description: "A card container with optional title and description",
    },
    Stack: {
      props: z.object({
        direction: z.enum(["horizontal", "vertical"]).optional(),
        gap: z.enum(["sm", "md", "lg"]).optional(),
        align: z
          .enum(["start", "center", "end", "stretch"])
          .nullable()
          .optional(),
        justify: z
          .enum(["start", "center", "end", "between", "around"])
          .nullable()
          .optional(),
      }),
      slots: ["default"],
      description:
        "Flex container for laying out children horizontally or vertically",
    },
    Grid: {
      props: z.object({
        columns: z.number().optional(),
        gap: z.enum(["sm", "md", "lg"]).optional(),
      }),
      slots: ["default"],
      description: "Grid layout container",
    },
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["h1", "h2", "h3", "h4"]).optional(),
      }),
      slots: [],
      description: "Heading text element",
    },
    Text: {
      props: z.object({
        text: z.string(),
        variant: z.enum(["body", "muted", "bold"]).optional(),
      }),
      slots: [],
      description: "Text paragraph element",
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z
          .enum(["primary", "secondary", "outline", "danger"])
          .optional(),
        disabled: z.boolean().nullable().optional(),
      }),
      slots: [],
      description: "Clickable button. Emits 'press' event.",
    },
    Input: {
      props: z.object({
        label: z.string().optional(),
        name: z.string(),
        type: z.enum(["text", "email", "password", "number"]).optional(),
        placeholder: z.string().optional(),
        value: z.string().optional(),
        checks: z.any().nullable().optional(),
        validateOn: z.string().nullable().optional(),
      }),
      slots: [],
      description:
        "Text input field with optional label. Emits 'change' event.",
    },
    Select: {
      props: z.object({
        label: z.string().optional(),
        name: z.string(),
        options: z.array(z.string()),
        placeholder: z.string().optional(),
        value: z.string().optional(),
        checks: z.any().nullable().optional(),
        validateOn: z.string().nullable().optional(),
      }),
      slots: [],
      description: "Dropdown select field. Emits 'change' event.",
    },
    Switch: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        checked: z.boolean().optional(),
      }),
      slots: [],
      description: "Toggle switch. Emits 'change' event.",
    },
    Badge: {
      props: z.object({
        text: z.string(),
        variant: z
          .enum(["default", "secondary", "outline", "destructive"])
          .optional(),
      }),
      slots: [],
      description: "Small status badge label",
    },
    Separator: {
      props: z.object({
        orientation: z.enum(["horizontal", "vertical"]).nullable().optional(),
      }),
      slots: [],
      description: "Visual separator line",
    },
    Progress: {
      props: z.object({
        value: z.number(),
        max: z.number().optional(),
        label: z.string().optional(),
      }),
      slots: [],
      description: "Progress bar",
    },
    Alert: {
      props: z.object({
        title: z.string(),
        message: z.string(),
        type: z.enum(["info", "success", "warning", "error"]).optional(),
      }),
      slots: [],
      description: "Alert / notification banner",
    },
    Table: {
      props: z.object({
        columns: z.array(z.string()),
        rows: z.array(z.array(z.string())),
        caption: z.string().optional(),
      }),
      slots: [],
      description: "Data table with columns and rows",
    },
    Accordion: {
      props: z.object({
        items: z.array(z.object({ title: z.string(), content: z.string() })),
        type: z.enum(["single", "multiple"]).optional(),
      }),
      slots: [],
      description: "Collapsible accordion sections",
    },
    Radio: {
      props: z.object({
        label: z.string().optional(),
        name: z.string(),
        options: z.array(z.string()),
        value: z.string().optional(),
        checks: z.any().nullable().optional(),
        validateOn: z.string().nullable().optional(),
      }),
      slots: [],
      description: "Radio button group. Emits 'change' event.",
    },
  },
  actions: {},
} as any);
