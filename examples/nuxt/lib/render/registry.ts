import { h, ref, defineComponent, type VNode, type PropType } from "vue";
import {
  defineRegistry,
  useBoundProp,
  useFieldValidation,
  type BaseComponentProps,
} from "@json-render/vue";
import { catalog } from "./catalog";

type Ctx<P = Record<string, unknown>> = BaseComponentProps<P>;

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({
      props,
      children,
    }: Ctx<{
      title?: string;
      description?: string | null;
      maxWidth?: "sm" | "md" | "lg" | "xl" | null;
      centered?: boolean | null;
    }>) => {
      const maxWidthClass =
        props.maxWidth === "sm"
          ? "max-w-sm"
          : props.maxWidth === "md"
            ? "max-w-md"
            : props.maxWidth === "lg"
              ? "max-w-lg"
              : props.maxWidth === "xl"
                ? "max-w-xl"
                : "";
      return h(
        "div",
        {
          class: [
            "rounded-lg border bg-white shadow-sm p-6",
            maxWidthClass,
            props.centered ? "mx-auto" : "",
          ]
            .filter(Boolean)
            .join(" "),
        },
        [
          props.title &&
            h("h3", { class: "text-lg font-semibold" }, props.title),
          props.description &&
            h("p", { class: "text-sm text-gray-500 mt-1" }, props.description),
          (props.title || props.description) &&
            h("div", { class: "mt-4" }, children),
          !(props.title || props.description) && children,
        ].filter(Boolean) as VNode[],
      );
    },

    Stack: ({
      props,
      children,
    }: Ctx<{
      direction?: "horizontal" | "vertical";
      gap?: "sm" | "md" | "lg";
      align?: "start" | "center" | "end" | "stretch" | null;
      justify?: "start" | "center" | "end" | "between" | "around" | null;
    }>) => {
      const gapClass =
        props.gap === "sm" ? "gap-2" : props.gap === "lg" ? "gap-6" : "gap-4";
      const dirClass =
        props.direction === "horizontal" ? "flex-row" : "flex-col";
      const alignMap: Record<string, string> = {
        start: "items-start",
        center: "items-center",
        end: "items-end",
        stretch: "items-stretch",
      };
      const justifyMap: Record<string, string> = {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
        around: "justify-around",
      };
      const alignClass = props.align ? (alignMap[props.align] ?? "") : "";
      const justifyClass = props.justify
        ? (justifyMap[props.justify] ?? "")
        : "";
      return h(
        "div",
        {
          class: ["flex", dirClass, gapClass, alignClass, justifyClass]
            .filter(Boolean)
            .join(" "),
        },
        children,
      );
    },

    Grid: ({
      props,
      children,
    }: Ctx<{ columns?: number; gap?: "sm" | "md" | "lg" }>) => {
      const cols = props.columns ?? 3;
      const gapClass =
        props.gap === "sm" ? "gap-2" : props.gap === "lg" ? "gap-6" : "gap-4";
      const colClass =
        cols === 1
          ? "grid-cols-1"
          : cols === 2
            ? "grid-cols-2"
            : cols === 3
              ? "grid-cols-3"
              : cols === 4
                ? "grid-cols-4"
                : `grid-cols-${cols}`;
      return h("div", { class: `grid ${colClass} ${gapClass}` }, children);
    },

    Heading: ({
      props,
    }: Ctx<{ text: string; level?: "h1" | "h2" | "h3" | "h4" }>) => {
      const tag = props.level ?? "h2";
      const sizeClass =
        tag === "h1"
          ? "text-3xl font-bold"
          : tag === "h2"
            ? "text-2xl font-semibold"
            : tag === "h3"
              ? "text-xl font-semibold"
              : "text-lg font-medium";
      return h(tag, { class: sizeClass }, props.text);
    },

    Text: ({
      props,
    }: Ctx<{ text: string; variant?: "body" | "muted" | "bold" }>) => {
      const variantClass =
        props.variant === "muted"
          ? "text-gray-500"
          : props.variant === "bold"
            ? "font-semibold"
            : "";
      return h("p", { class: variantClass }, props.text);
    },

    Button: ({
      props,
      emit,
    }: Ctx<{
      label: string;
      variant?: "primary" | "secondary" | "outline" | "danger";
      disabled?: boolean | null;
    }>) => {
      const baseClass =
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
      const variantClass =
        props.variant === "primary"
          ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
          : props.variant === "danger"
            ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
            : props.variant === "outline"
              ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500";
      return h(
        "button",
        {
          class: `${baseClass} ${variantClass}`,
          disabled: props.disabled ?? false,
          onClick: () => emit("press"),
        },
        props.label,
      );
    },

    Input: ({
      props,
      bindings,
      emit,
    }: Ctx<{
      label?: string;
      name: string;
      type?: string;
      placeholder?: string;
      value?: string;
      checks?: unknown;
      validateOn?: string | null;
    }>) => {
      const [value, setValue] = useBoundProp<string>(
        props.value,
        bindings?.value,
      );
      const validation = props.checks
        ? useFieldValidation(`/${props.name}`, {
            checks: props.checks as any[],
            validateOn: (props.validateOn as "blur" | "change") ?? undefined,
          })
        : null;

      return h(
        "div",
        { class: "flex flex-col gap-1.5" },
        [
          props.label &&
            h(
              "label",
              { class: "text-sm font-medium text-gray-700" },
              props.label,
            ),
          h("input", {
            type: props.type ?? "text",
            placeholder: props.placeholder,
            value: value ?? "",
            class:
              "rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
            onInput: (e: Event) => {
              const val = (e.target as HTMLInputElement).value;
              setValue(val);
              emit("change");
              if (validation && props.validateOn === "change") {
                validation.validate();
              }
            },
            onBlur: () => {
              if (validation && props.validateOn === "blur") {
                validation.touch();
                validation.validate();
              }
            },
          }),
          validation &&
            validation.errors.length > 0 &&
            h("p", { class: "text-xs text-red-500" }, validation.errors[0]),
        ].filter(Boolean) as VNode[],
      );
    },

    Select: ({
      props,
      bindings,
      emit,
    }: Ctx<{
      label?: string;
      name: string;
      options: string[];
      placeholder?: string;
      value?: string;
      checks?: unknown;
      validateOn?: string | null;
    }>) => {
      const [value, setValue] = useBoundProp<string>(
        props.value,
        bindings?.value,
      );
      const options = props.options ?? [];
      const validation = props.checks
        ? useFieldValidation(`/${props.name}`, {
            checks: props.checks as any[],
            validateOn: (props.validateOn as "blur" | "change") ?? undefined,
          })
        : null;

      return h(
        "div",
        { class: "flex flex-col gap-1.5" },
        [
          props.label &&
            h(
              "label",
              { class: "text-sm font-medium text-gray-700" },
              props.label,
            ),
          h(
            "select",
            {
              value: value ?? "",
              class:
                "rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
              onChange: (e: Event) => {
                const val = (e.target as HTMLSelectElement).value;
                setValue(val);
                emit("change");
                if (validation && props.validateOn === "change") {
                  validation.validate();
                }
              },
            },
            [
              props.placeholder &&
                h("option", { value: "", disabled: true }, props.placeholder),
              ...options.map((opt: string) =>
                h("option", { value: opt, key: opt }, opt),
              ),
            ].filter(Boolean) as VNode[],
          ),
          validation &&
            validation.errors.length > 0 &&
            h("p", { class: "text-xs text-red-500" }, validation.errors[0]),
        ].filter(Boolean) as VNode[],
      );
    },

    Switch: ({
      props,
      bindings,
      emit,
    }: Ctx<{ label: string; name: string; checked?: boolean }>) => {
      const [checked, setChecked] = useBoundProp<boolean>(
        props.checked,
        bindings?.checked,
      );
      const isOn = checked ?? false;
      return h("label", { class: "flex items-center gap-3 cursor-pointer" }, [
        h(
          "button",
          {
            role: "switch",
            "aria-checked": isOn,
            class: [
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              isOn ? "bg-blue-600" : "bg-gray-200",
            ].join(" "),
            onClick: () => {
              setChecked(!isOn);
              emit("change");
            },
          },
          h("span", {
            class: [
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              isOn ? "translate-x-6" : "translate-x-1",
            ].join(" "),
          }),
        ),
        h("span", { class: "text-sm" }, props.label),
      ]);
    },

    Badge: ({
      props,
    }: Ctx<{
      text: string;
      variant?: "default" | "secondary" | "outline" | "destructive";
    }>) => {
      const variantClass =
        props.variant === "secondary"
          ? "bg-gray-100 text-gray-800"
          : props.variant === "outline"
            ? "border border-gray-300 text-gray-700"
            : props.variant === "destructive"
              ? "bg-red-100 text-red-800"
              : "bg-blue-100 text-blue-800";
      return h(
        "span",
        {
          class: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClass}`,
        },
        props.text,
      );
    },

    Separator: () => {
      return h("hr", { class: "border-gray-200" });
    },

    Progress: ({
      props,
    }: Ctx<{ value: number; max?: number; label?: string }>) => {
      const pct = Math.min(
        100,
        Math.round((props.value / (props.max ?? 100)) * 100),
      );
      return h(
        "div",
        { class: "flex flex-col gap-1.5" },
        [
          props.label &&
            h("div", { class: "flex justify-between text-sm" }, [
              h("span", { class: "text-gray-600" }, props.label),
              h("span", { class: "font-medium" }, `${pct}%`),
            ]),
          h(
            "div",
            {
              class: "h-2 w-full rounded-full bg-gray-200 overflow-hidden",
            },
            h("div", {
              class: "h-full rounded-full bg-blue-600 transition-all",
              style: { width: `${pct}%` },
            }),
          ),
        ].filter(Boolean) as VNode[],
      );
    },

    Alert: ({
      props,
    }: Ctx<{
      title: string;
      message: string;
      type?: "info" | "success" | "warning" | "error";
    }>) => {
      const typeClasses: Record<string, string> = {
        success: "bg-green-50 border-green-200 text-green-800",
        warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
        error: "bg-red-50 border-red-200 text-red-800",
        info: "bg-blue-50 border-blue-200 text-blue-800",
      };
      const cls = typeClasses[props.type ?? "info"] ?? typeClasses.info;
      return h("div", { class: `rounded-md border p-4 ${cls}` }, [
        h("p", { class: "text-sm font-medium" }, props.title),
        h("p", { class: "text-sm mt-1 opacity-80" }, props.message),
      ]);
    },

    Table: ({
      props,
    }: Ctx<{
      columns: string[];
      rows: string[][];
      caption?: string;
    }>) => {
      return h(
        "div",
        { class: "overflow-x-auto" },
        [
          h("table", { class: "min-w-full text-sm" }, [
            h(
              "thead",
              null,
              h(
                "tr",
                { class: "border-b" },
                props.columns.map((col: string) =>
                  h(
                    "th",
                    {
                      key: col,
                      class: "px-4 py-2 text-left font-medium text-gray-500",
                    },
                    col,
                  ),
                ),
              ),
            ),
            h(
              "tbody",
              null,
              props.rows.map((row: string[], i: number) =>
                h(
                  "tr",
                  { key: i, class: "border-b last:border-0" },
                  row.map((cell: string, j: number) =>
                    h("td", { key: j, class: "px-4 py-2 text-gray-700" }, cell),
                  ),
                ),
              ),
            ),
          ]),
          props.caption &&
            h("p", { class: "text-xs text-gray-400 mt-2 px-4" }, props.caption),
        ].filter(Boolean) as VNode[],
      );
    },

    Accordion: defineComponent({
      props: {
        props: {
          type: Object as PropType<{
            items: Array<{ title: string; content: string }>;
            type?: "single" | "multiple";
          }>,
          required: true,
        },
      },
      setup(compProps) {
        const openItems = ref<Set<number>>(new Set());

        const toggle = (idx: number) => {
          const next = new Set(openItems.value);
          if (next.has(idx)) {
            next.delete(idx);
          } else {
            if (compProps.props.type === "single") next.clear();
            next.add(idx);
          }
          openItems.value = next;
        };

        return () =>
          h(
            "div",
            { class: "divide-y border rounded-md" },
            compProps.props.items.map(
              (item: { title: string; content: string }, i: number) =>
                h("div", { key: i }, [
                  h(
                    "button",
                    {
                      class:
                        "flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-gray-50 transition-colors",
                      onClick: () => toggle(i),
                    },
                    [
                      h("span", null, item.title),
                      h(
                        "span",
                        {
                          class: [
                            "transform transition-transform text-gray-400",
                            openItems.value.has(i) ? "rotate-180" : "",
                          ].join(" "),
                        },
                        "\u25BE",
                      ),
                    ],
                  ),
                  openItems.value.has(i) &&
                    h(
                      "div",
                      { class: "px-4 pb-3 text-sm text-gray-600" },
                      item.content,
                    ),
                ]),
            ),
          );
      },
    }) as any,

    Radio: ({
      props,
      bindings,
      emit,
    }: Ctx<{
      label?: string;
      name: string;
      options: string[];
      value?: string;
    }>) => {
      const [value, setValue] = useBoundProp<string>(
        props.value,
        bindings?.value,
      );

      return h(
        "div",
        { class: "flex flex-col gap-1.5" },
        [
          props.label &&
            h(
              "label",
              { class: "text-sm font-medium text-gray-700" },
              props.label,
            ),
          h(
            "div",
            { class: "flex gap-4" },
            (props.options ?? []).map((opt: string) =>
              h(
                "label",
                {
                  key: opt,
                  class: "flex items-center gap-2 cursor-pointer",
                },
                [
                  h("input", {
                    type: "radio",
                    name: props.name,
                    value: opt,
                    checked: value === opt,
                    class: "accent-blue-600",
                    onChange: () => {
                      setValue(opt);
                      emit("change");
                    },
                  }),
                  h("span", { class: "text-sm" }, opt),
                ],
              ),
            ),
          ),
        ].filter(Boolean) as VNode[],
      );
    },
  },
});
