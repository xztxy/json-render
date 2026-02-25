import { describe, it, expect } from "vitest";
import { defineComponent, h, createApp } from "vue";
import {
  flatToTree,
  buildSpecFromParts,
  getTextFromParts,
  useBoundProp,
} from "./hooks.js";
import { StateProvider, useStateBinding } from "./composables/state.js";

describe("flatToTree", () => {
  it("converts array of elements to tree structure", () => {
    const elements = [
      { key: "container", type: "stack", props: {}, parentKey: null },
      {
        key: "text1",
        type: "text",
        props: { content: "Hello" },
        parentKey: "container",
      },
      {
        key: "text2",
        type: "text",
        props: { content: "World" },
        parentKey: "container",
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.root).toBe("container");
    expect(Object.keys(tree.elements)).toHaveLength(3);
    expect(tree.elements["container"]).toBeDefined();
    expect(tree.elements["text1"]).toBeDefined();
    expect(tree.elements["text2"]).toBeDefined();
  });

  it("builds parent-child relationships", () => {
    const elements = [
      { key: "root", type: "stack", props: {}, parentKey: null },
      { key: "child1", type: "text", props: {}, parentKey: "root" },
      { key: "child2", type: "text", props: {}, parentKey: "root" },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["root"]!.children).toHaveLength(2);
    expect(tree.elements["root"]!.children).toContain("child1");
    expect(tree.elements["root"]!.children).toContain("child2");
  });

  it("handles single root element", () => {
    const elements = [
      {
        key: "only",
        type: "text",
        props: { content: "Single" },
        parentKey: null,
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.root).toBe("only");
    expect(Object.keys(tree.elements)).toHaveLength(1);
  });

  it("handles deeply nested elements", () => {
    const elements = [
      { key: "level0", type: "stack", props: {}, parentKey: null },
      { key: "level1", type: "stack", props: {}, parentKey: "level0" },
      { key: "level2", type: "stack", props: {}, parentKey: "level1" },
      { key: "level3", type: "text", props: {}, parentKey: "level2" },
    ];

    const tree = flatToTree(elements);

    expect(tree.root).toBe("level0");
    expect(tree.elements["level0"]!.children).toContain("level1");
    expect(tree.elements["level1"]!.children).toContain("level2");
    expect(tree.elements["level2"]!.children).toContain("level3");
  });

  it("preserves element props", () => {
    const elements = [
      {
        key: "btn",
        type: "button",
        props: { label: "Click me", variant: "primary" },
        parentKey: null,
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["btn"]!.props).toEqual({
      label: "Click me",
      variant: "primary",
    });
  });

  it("preserves visibility conditions", () => {
    const elements = [
      {
        key: "conditional",
        type: "text",
        props: {},
        parentKey: null,
        visible: { $state: "/isVisible" },
      },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["conditional"]!.visible).toEqual({
      $state: "/isVisible",
    });
  });

  it("handles empty elements array", () => {
    const tree = flatToTree([]);

    expect(tree.root).toBe("");
    expect(Object.keys(tree.elements)).toHaveLength(0);
  });

  it("handles multiple children correctly", () => {
    const elements = [
      { key: "parent", type: "grid", props: {}, parentKey: null },
      { key: "a", type: "card", props: {}, parentKey: "parent" },
      { key: "b", type: "card", props: {}, parentKey: "parent" },
      { key: "c", type: "card", props: {}, parentKey: "parent" },
      { key: "d", type: "card", props: {}, parentKey: "parent" },
    ];

    const tree = flatToTree(elements);

    expect(tree.elements["parent"]!.children).toHaveLength(4);
    expect(tree.elements["parent"]!.children).toEqual(["a", "b", "c", "d"]);
  });
});

describe("buildSpecFromParts", () => {
  it("returns null when no data-spec parts are present", () => {
    const parts = [
      { type: "text", text: "Hello there" },
      { type: "text", text: "How can I help?" },
    ];
    expect(buildSpecFromParts(parts)).toBeNull();
  });

  it("builds a spec from patch parts", () => {
    const parts = [
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "main" },
        },
      },
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: {
            op: "add",
            path: "/elements/main",
            value: { type: "Card", props: { title: "Hello" }, children: [] },
          },
        },
      },
    ];

    const spec = buildSpecFromParts(parts);
    expect(spec).not.toBeNull();
    expect(spec!.root).toBe("main");
    expect(spec!.elements["main"]).toEqual({
      type: "Card",
      props: { title: "Hello" },
      children: [],
    });
  });

  it("handles flat spec parts", () => {
    const parts = [
      {
        type: "data-spec",
        data: {
          type: "flat",
          spec: {
            root: "card-1",
            elements: {
              "card-1": { type: "Card", props: {}, children: [] },
            },
          },
        },
      },
    ];

    const spec = buildSpecFromParts(parts);
    expect(spec).not.toBeNull();
    expect(spec!.root).toBe("card-1");
    expect(spec!.elements["card-1"]).toBeDefined();
  });

  it("ignores non-spec parts", () => {
    const parts = [
      { type: "text", text: "Some text" },
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "main" },
        },
      },
      { type: "tool-invocation", data: { toolName: "search" } },
    ];

    const spec = buildSpecFromParts(parts);
    expect(spec).not.toBeNull();
    expect(spec!.root).toBe("main");
  });

  it("applies patches incrementally", () => {
    const parts = [
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "main" },
        },
      },
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: {
            op: "add",
            path: "/elements/main",
            value: { type: "Stack", props: {}, children: ["child"] },
          },
        },
      },
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: {
            op: "add",
            path: "/elements/child",
            value: { type: "Text", props: { content: "Hi" }, children: [] },
          },
        },
      },
    ];

    const spec = buildSpecFromParts(parts);
    expect(spec).not.toBeNull();
    expect(Object.keys(spec!.elements)).toHaveLength(2);
    expect(spec!.elements["child"]!.props.content).toBe("Hi");
  });

  it("returns null from empty parts list", () => {
    const spec = buildSpecFromParts([]);
    expect(spec).toBeNull();
  });
});

describe("getTextFromParts", () => {
  it("extracts text from text parts", () => {
    const parts = [
      { type: "text", text: "Hello" },
      { type: "text", text: "World" },
    ];
    expect(getTextFromParts(parts)).toBe("Hello\n\nWorld");
  });

  it("returns empty string when no text parts", () => {
    const parts = [
      {
        type: "data-spec",
        data: {
          type: "patch",
          patch: { op: "add", path: "/root", value: "x" },
        },
      },
    ];
    expect(getTextFromParts(parts)).toBe("");
  });

  it("ignores non-text parts", () => {
    const parts = [
      { type: "text", text: "Before" },
      { type: "data-spec", data: {} },
      { type: "tool-invocation", data: {} },
      { type: "text", text: "After" },
    ];
    expect(getTextFromParts(parts)).toBe("Before\n\nAfter");
  });

  it("trims whitespace from text parts", () => {
    const parts = [
      { type: "text", text: "  Hello  " },
      { type: "text", text: "  World  " },
    ];
    expect(getTextFromParts(parts)).toBe("Hello\n\nWorld");
  });

  it("skips empty text parts", () => {
    const parts = [
      { type: "text", text: "Hello" },
      { type: "text", text: "   " },
      { type: "text", text: "World" },
    ];
    expect(getTextFromParts(parts)).toBe("Hello\n\nWorld");
  });

  it("ignores text parts with non-string text field", () => {
    const parts = [
      { type: "text", text: "Valid" },
      { type: "text", text: undefined as unknown as string },
      { type: "text", text: 42 as unknown as string },
      { type: "text", text: "Also valid" },
    ];
    expect(getTextFromParts(parts)).toBe("Valid\n\nAlso valid");
  });
});

function runInStateProvider<T>(
  initialState: Record<string, unknown>,
  fn: () => T,
): T {
  let result: T | undefined;

  const Inner = defineComponent({
    setup() {
      result = fn();
      return () => null;
    },
  });

  const App = defineComponent({
    setup() {
      return () => h(StateProvider, { initialState }, () => h(Inner));
    },
  });

  const container = document.createElement("div");
  const app = createApp(App);
  app.mount(container);
  app.unmount();

  return result!;
}

describe("useBoundProp", () => {
  it("returns the prop value as-is", () => {
    const [value] = runInStateProvider({ name: "test" }, () =>
      useBoundProp<string>("hello", undefined),
    );
    expect(value).toBe("hello");
  });

  it("returns undefined when prop value is undefined", () => {
    const [value] = runInStateProvider({}, () =>
      useBoundProp<string>(undefined, undefined),
    );
    expect(value).toBeUndefined();
  });

  it("provides a setter function", () => {
    const [, setValue] = runInStateProvider({ name: "test" }, () =>
      useBoundProp<string>("hello", "/name"),
    );
    expect(typeof setValue).toBe("function");
  });
});

describe("useStateBinding", () => {
  it("returns value from state and a setter", () => {
    const [value, setValue] = runInStateProvider({ x: 42 }, () =>
      useStateBinding<number>("/x"),
    );
    expect(value).toBe(42);
    expect(typeof setValue).toBe("function");
  });

  it("returns undefined for missing path", () => {
    const [value] = runInStateProvider({}, () =>
      useStateBinding<string>("/missing"),
    );
    expect(value).toBeUndefined();
  });
});
