import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

/**
 * Web playground component catalog
 *
 * This defines the components available for AI generation in the playground.
 * Components map to implementations in lib/catalog/components.tsx
 * Actions map to handlers in lib/catalog/actions.ts
 */
export const playgroundCatalog = defineCatalog(schema, {
  components: {
    // Layout Components
    Card: {
      props: z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
        maxWidth: z.enum(["sm", "md", "lg", "full"]).nullable(),
        centered: z.boolean().nullable(),
      }),
      slots: ["default"],
      description:
        "Container card for content sections. Use for forms/content boxes, NOT for page headers.",
    },

    Stack: {
      props: z.object({
        direction: z.enum(["horizontal", "vertical"]).nullable(),
        gap: z.enum(["none", "sm", "md", "lg"]).nullable(),
        align: z.enum(["start", "center", "end", "stretch"]).nullable(),
        justify: z
          .enum(["start", "center", "end", "between", "around"])
          .nullable(),
      }),
      slots: ["default"],
      description: "Flex container for layouts",
    },

    Grid: {
      props: z.object({
        columns: z
          .union([
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(5),
            z.literal(6),
          ])
          .nullable(),
        gap: z.enum(["sm", "md", "lg"]).nullable(),
      }),
      slots: ["default"],
      description: "Grid layout (1-6 columns)",
    },

    Divider: {
      props: z.object({}),
      description: "Horizontal separator line",
    },

    Dialog: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
        openPath: z.string(),
      }),
      slots: ["default"],
      description:
        "Modal dialog controlled by state. Set openPath to a boolean state path (e.g. '/showDialog'). Use setState to toggle it open/closed. Children render inside the dialog body.",
    },

    Accordion: {
      props: z.object({
        items: z.array(
          z.object({
            title: z.string(),
            content: z.string(),
          }),
        ),
        type: z.enum(["single", "multiple"]).nullable(),
      }),
      description:
        "Collapsible accordion with expandable sections. Pass items as an array of {title, content} objects. Type 'single' allows one open at a time (default), 'multiple' allows several.",
    },

    ButtonGroup: {
      props: z.object({
        buttons: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
          }),
        ),
        statePath: z.string().nullable(),
      }),
      events: ["change"],
      description:
        "Group of toggle buttons. Use statePath to bind the selected value.",
    },

    Carousel: {
      props: z.object({
        items: z.array(
          z.object({
            title: z.string().nullable(),
            description: z.string().nullable(),
          }),
        ),
      }),
      description: "Horizontally scrollable carousel of cards.",
    },

    Collapsible: {
      props: z.object({
        title: z.string(),
        defaultOpen: z.boolean().nullable(),
      }),
      slots: ["default"],
      description:
        "Collapsible section with a trigger. Children render inside the collapsible body.",
    },

    Table: {
      props: z.object({
        columns: z.array(z.string()),
        rows: z.array(z.array(z.string())),
        caption: z.string().nullable(),
      }),
      description: "Data table with columns and rows.",
    },

    Drawer: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
        openPath: z.string(),
      }),
      slots: ["default"],
      description:
        "Bottom sheet drawer controlled by state. Set openPath to a boolean state path. Use setState to toggle it.",
    },

    DropdownMenu: {
      props: z.object({
        label: z.string(),
        items: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
          }),
        ),
      }),
      events: ["select"],
      description: "Dropdown menu with a trigger button and selectable items.",
    },

    Pagination: {
      props: z.object({
        totalPages: z.number(),
        statePath: z.string(),
      }),
      events: ["change"],
      description:
        "Page navigation. Bind statePath to a number representing the current page.",
    },

    Popover: {
      props: z.object({
        trigger: z.string(),
        content: z.string(),
      }),
      description: "Small popover that appears on click of the trigger text.",
    },

    Separator: {
      props: z.object({
        orientation: z.enum(["horizontal", "vertical"]).nullable(),
      }),
      description: "Visual separator line.",
    },

    Skeleton: {
      props: z.object({
        width: z.string().nullable(),
        height: z.string().nullable(),
        rounded: z.boolean().nullable(),
      }),
      description: "Loading placeholder skeleton.",
    },

    Slider: {
      props: z.object({
        label: z.string().nullable(),
        min: z.number().nullable(),
        max: z.number().nullable(),
        step: z.number().nullable(),
        statePath: z.string().nullable(),
      }),
      events: ["change"],
      description: "Range slider input. Use statePath to bind the value.",
    },

    Spinner: {
      props: z.object({
        size: z.enum(["sm", "md", "lg"]).nullable(),
        label: z.string().nullable(),
      }),
      description: "Loading spinner indicator.",
    },

    Tabs: {
      props: z.object({
        tabs: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
          }),
        ),
        defaultValue: z.string().nullable(),
        statePath: z.string().nullable(),
      }),
      events: ["change"],
      description:
        "Tab navigation. Use statePath to bind the active tab value.",
    },

    Toggle: {
      props: z.object({
        label: z.string(),
        pressed: z.boolean().nullable(),
        statePath: z.string().nullable(),
        variant: z.enum(["default", "outline"]).nullable(),
      }),
      events: ["change"],
      description: "Toggle button. Use statePath to bind pressed state.",
    },

    ToggleGroup: {
      props: z.object({
        items: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
          }),
        ),
        type: z.enum(["single", "multiple"]).nullable(),
        statePath: z.string().nullable(),
      }),
      events: ["change"],
      description:
        "Group of toggle buttons. Type 'single' (default) or 'multiple'.",
    },

    Tooltip: {
      props: z.object({
        content: z.string(),
        text: z.string(),
      }),
      description: "Hover tooltip. Shows content on hover over the text.",
    },

    Typography: {
      props: z.object({
        text: z.string(),
        variant: z
          .enum([
            "h1",
            "h2",
            "h3",
            "h4",
            "p",
            "lead",
            "large",
            "small",
            "muted",
            "blockquote",
            "code",
            "list",
          ])
          .nullable(),
      }),
      description:
        "Typographic text with semantic variants (headings, paragraphs, lead, blockquote, code, etc.).",
    },

    // Form Inputs
    Input: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        type: z.enum(["text", "email", "password", "number"]).nullable(),
        placeholder: z.string().nullable(),
        statePath: z.string().nullable(),
      }),
      events: ["submit", "focus", "blur"],
      description:
        "Text input field. Use statePath to bind to the state model for two-way binding.",
    },

    Textarea: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        placeholder: z.string().nullable(),
        rows: z.number().nullable(),
        statePath: z.string().nullable(),
      }),
      description:
        "Multi-line text input. Use statePath to bind to the state model.",
    },

    Select: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(z.string()),
        placeholder: z.string().nullable(),
        statePath: z.string().nullable(),
      }),
      events: ["change"],
      description:
        "Dropdown select input. Use statePath to bind to the state model.",
    },

    Checkbox: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        checked: z.boolean().nullable(),
        statePath: z.string().nullable(),
      }),
      events: ["change"],
      description: "Checkbox input. Use statePath to bind to the state model.",
    },

    Radio: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        options: z.array(z.string()),
        statePath: z.string().nullable(),
      }),
      events: ["change"],
      description:
        "Radio button group. Use statePath to bind to the state model.",
    },

    Switch: {
      props: z.object({
        label: z.string(),
        name: z.string(),
        checked: z.boolean().nullable(),
        statePath: z.string().nullable(),
      }),
      events: ["change"],
      description:
        "Toggle switch input. Use statePath to bind to the state model.",
    },

    // Actions
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary", "danger"]).nullable(),
        disabled: z.boolean().nullable(),
      }),
      events: ["press"],
      description:
        "Clickable button. Bind on.press for the handler to call on press.",
    },

    Link: {
      props: z.object({
        label: z.string(),
        href: z.string(),
      }),
      events: ["press"],
      description: "Anchor link. Bind on.press for the click handler.",
    },

    // Typography
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["h1", "h2", "h3", "h4"]).nullable(),
      }),
      description: "Heading text (h1-h4)",
    },

    Text: {
      props: z.object({
        text: z.string(),
        variant: z.enum(["body", "caption", "muted"]).nullable(),
      }),
      description: "Paragraph text",
    },

    // Data Display
    Image: {
      props: z.object({
        alt: z.string(),
        width: z.number().nullable(),
        height: z.number().nullable(),
      }),
      description: "Placeholder image (displays alt text in a styled box)",
    },

    Avatar: {
      props: z.object({
        src: z.string().nullable(),
        name: z.string(),
        size: z.enum(["sm", "md", "lg"]).nullable(),
      }),
      description: "User avatar with fallback initials",
    },

    Badge: {
      props: z.object({
        text: z.string(),
        variant: z.enum(["default", "success", "warning", "danger"]).nullable(),
      }),
      description: "Status badge",
    },

    Alert: {
      props: z.object({
        title: z.string(),
        message: z.string().nullable(),
        type: z.enum(["info", "success", "warning", "error"]).nullable(),
      }),
      description: "Alert banner",
    },

    Progress: {
      props: z.object({
        value: z.number(),
        max: z.number().nullable(),
        label: z.string().nullable(),
      }),
      description: "Progress bar (value 0-100)",
    },

    Rating: {
      props: z.object({
        value: z.number(),
        max: z.number().nullable(),
        label: z.string().nullable(),
      }),
      description: "Star rating display",
    },

    // Charts
    BarGraph: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(
          z.object({
            label: z.string(),
            value: z.number(),
          }),
        ),
      }),
      description: "Vertical bar chart",
    },

    LineGraph: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(
          z.object({
            label: z.string(),
            value: z.number(),
          }),
        ),
      }),
      description: "Line chart with points",
    },
  },

  actions: {
    // Core state actions (built-in to the renderer)
    setState: {
      params: z.object({
        path: z.string(),
        value: z.unknown(),
      }),
      description: "Update a value in the state model at the given path.",
    },

    pushState: {
      params: z.object({
        path: z.string(),
        value: z.unknown(),
        clearPath: z.string().optional(),
      }),
      description:
        'Append an item to an array in the state model. The value can contain { path: "/statePath" } references to read from current state, and "$id" to auto-generate a unique ID. Use clearPath to reset another path after pushing (e.g. clear an input field).',
    },

    removeState: {
      params: z.object({
        path: z.string(),
        index: z.number(),
      }),
      description:
        "Remove an item from an array in the state model at the given index.",
    },

    // Demo actions for the playground
    buttonClick: {
      params: z.object({
        message: z.string().nullable(),
      }),
      description:
        "Triggered when a button is clicked. Shows a toast with the message.",
    },

    formSubmit: {
      params: z.object({
        formName: z.string().nullable(),
      }),
      description:
        "Triggered when a form is submitted. Shows a toast confirming submission.",
    },

    linkClick: {
      params: z.object({
        href: z.string(),
      }),
      description:
        "Triggered when a link is clicked. Shows a toast with the destination.",
    },
  },
});
