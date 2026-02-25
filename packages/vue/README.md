# @json-render/vue

Vue 3 renderer for json-render. Turn JSON specs into Vue components with data binding, visibility, and actions.

## Installation

```bash
npm install @json-render/vue @json-render/core zod
```

## Quick Start

### 1. Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/vue/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      description: "A card container",
    },
    Button: {
      props: z.object({
        label: z.string(),
      }),
      description: "A clickable button",
    },
    Input: {
      props: z.object({
        value: z.union([z.string(), z.record(z.unknown())]).nullable(),
        label: z.string(),
        placeholder: z.string().nullable(),
      }),
      description: "Text input field with optional value binding",
    },
  },
  actions: {
    submit: { description: "Submit the form" },
  },
});
```

### 2. Define Component Implementations

```typescript
import { h } from "vue";
import { defineRegistry, useBoundProp } from "@json-render/vue";
import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) =>
      h("div", { class: "card" }, [
        h("h3", null, props.title),
        props.description && h("p", null, props.description),
        children,
      ]),
    Button: ({ props, emit }) =>
      h("button", { onClick: () => emit("press") }, props.label),
    Input: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp(props.value, bindings?.value);
      return h("label", null, [
        props.label,
        h("input", {
          placeholder: props.placeholder ?? "",
          value: value ?? "",
          onInput: (e: Event) =>
            setValue((e.target as HTMLInputElement).value),
        }),
      ]);
    },
  },
  actions: {
    submit: async (_params, _setState) => {
      console.log("Form submitted");
    },
  },
});
```

### 3. Render a Spec

```vue
<script setup lang="ts">
import { JSONUIProvider, Renderer } from "@json-render/vue";
import { registry } from "./registry";

const spec = {
  root: "card",
  state: { name: "" },
  elements: {
    card: {
      type: "Card",
      props: { title: "Hello", description: null },
      children: ["input", "btn"],
    },
    input: {
      type: "Input",
      props: {
        label: "Name",
        placeholder: "Enter your name",
        value: { $bindState: "/name" },
      },
    },
    btn: {
      type: "Button",
      props: { label: "Submit" },
      on: { press: { action: "submit" } },
    },
  },
};
</script>

<template>
  <JSONUIProvider :registry="registry" :initial-state="spec.state ?? {}">
    <Renderer :spec="spec" :registry="registry" />
  </JSONUIProvider>
</template>
```

## Spec Format

The spec is a flat map of elements. Each element references its children by key:

```json
{
  "root": "card",
  "state": { "count": 0 },
  "elements": {
    "card": {
      "type": "Card",
      "props": { "title": "Counter" },
      "children": ["display", "increment"]
    },
    "display": {
      "type": "Text",
      "props": { "text": { "$state": "/count" } }
    },
    "increment": {
      "type": "Button",
      "props": { "label": "+1" },
      "on": {
        "press": {
          "action": "setState",
          "params": { "statePath": "/count", "value": 1 }
        }
      }
    }
  }
}
```

## Composables

### `useStateStore()`

Access the state context inside any component rendered within a `JSONUIProvider`.

```typescript
import { useStateStore } from "@json-render/vue";

const { state, get, set, getSnapshot } = useStateStore();
```

### `useBoundProp(propValue, bindingPath)`

Two-way binding helper for `$bindState` / `$bindItem` expressions.

```typescript
import { useBoundProp } from "@json-render/vue";

const [value, setValue] = useBoundProp<string>(props.value, bindings?.value);
```

### `useVisibility()`

Evaluate visibility conditions.

```typescript
import { useVisibility } from "@json-render/vue";

const { isVisible, ctx } = useVisibility();
```

### `useActions()`

Access action execution.

```typescript
import { useActions } from "@json-render/vue";

const { execute, loadingActions } = useActions();
```

### `useFieldValidation(path, config)`

Field-level validation.

```typescript
import { useFieldValidation } from "@json-render/vue";

const { errors, isValid, validate, touch } = useFieldValidation("/email", {
  checks: [{ type: "required", message: "Email is required" }],
});
```

## Provider Components

All providers are renderless components that use Vue's `provide`/`inject`:

- **`StateProvider`** -- Manages state model with `createStateStore` from core
- **`VisibilityProvider`** -- Evaluates visibility conditions against state
- **`ValidationProvider`** -- Handles form validation
- **`ActionProvider`** -- Executes action bindings (setState, pushState, custom actions)
- **`JSONUIProvider`** -- Composes all of the above into a single provider

## Dynamic Prop Expressions

Props support dynamic expressions that resolve against state:

| Expression | Description |
|---|---|
| `{ "$state": "/path" }` | Read a value from state |
| `{ "$bindState": "/path" }` | Two-way binding to state |
| `{ "$item": "field" }` | Read from current repeat item |
| `{ "$bindItem": "field" }` | Two-way bind to repeat item field |
| `{ "$index": true }` | Current repeat index |
| `{ "$cond": ..., "$then": ..., "$else": ... }` | Conditional value |
| `{ "$computed": "fnName", "args": {...} }` | Computed function |
| `{ "$template": "Hello ${/name}" }` | String interpolation |

## Built-in Actions

| Action | Description |
|---|---|
| `setState` | Set a value at a state path |
| `pushState` | Append to an array in state |
| `removeState` | Remove an item from an array by index |
| `validateForm` | Validate all registered fields |

## Key Exports

```typescript
// Renderer
export { Renderer, JSONUIProvider, defineRegistry, createRenderer, useBoundProp };

// Composables
export { useStateStore, useStateValue };
export { useVisibility, useIsVisible };
export { useActions, useAction };
export { useValidation, useFieldValidation };
export { useRepeatScope };

// Provider components
export { StateProvider, VisibilityProvider, ActionProvider, ValidationProvider };
export { RepeatScopeProvider };

// Schema
export { schema };

// Types
export type {
  ComponentRenderProps, ComponentRenderer, ComponentRegistry,
  RendererProps, JSONUIProviderProps, CreateRendererProps,
  BaseComponentProps, ComponentContext, ComponentFn,
  EventHandle, SetState, StateModel,
};
```
