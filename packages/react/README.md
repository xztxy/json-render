# @json-render/react

React renderer for json-render. Turn JSON specs into React components with data binding, visibility, and actions.

## Installation

```bash
npm install @json-render/react @json-render/core zod
```

## Quick Start

### 1. Create a Catalog

```typescript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react";
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
        action: z.string(),
      }),
      description: "A clickable button",
    },
    Input: {
      props: z.object({
        label: z.string(),
        placeholder: z.string().nullable(),
      }),
      description: "Text input field",
    },
  },
  actions: {
    submit: { description: "Submit the form" },
    cancel: { description: "Cancel and close" },
  },
});
```

### 2. Define Component Implementations

```tsx
import { defineRegistry, useStateStore } from "@json-render/react";
import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => (
      <div className="card">
        <h3>{props.title}</h3>
        {props.description && <p>{props.description}</p>}
        {children}
      </div>
    ),
    Button: ({ props, emit }) => (
      <button onClick={() => emit?.("press")}>
        {props.label}
      </button>
    ),
    Input: ({ props }) => {
      const { get, set } = useStateStore();
      return (
        <label>
          {props.label}
          <input
            placeholder={props.placeholder ?? ""}
            value={get("/form/value") ?? ""}
            onChange={(e) => set("/form/value", e.target.value)}
          />
        </label>
      );
    },
  },
});
```

### 3. Render Specs

```tsx
import { Renderer, StateProvider, ActionProvider } from "@json-render/react";
import { registry } from "./registry";

function App({ spec }) {
  return (
    <StateProvider initialState={{ form: { value: "" } }}>
      <ActionProvider handlers={{
        submit: () => console.log("Submit"),
      }}>
        <Renderer spec={spec} registry={registry} />
      </ActionProvider>
    </StateProvider>
  );
}
```

## Spec Format

The React renderer uses an element tree format:

```typescript
interface Spec {
  root: Element;
}

interface Element {
  type: string;           // Component name from catalog
  props: object;          // Component props
  children?: Element[];   // Nested elements
  visible?: VisibilityCondition;
}
```

Example spec:

```json
{
  "root": {
    "type": "Card",
    "props": { "title": "Welcome" },
    "children": [
      {
        "type": "Input",
        "props": { "label": "Name", "placeholder": "Enter name" }
      },
      {
        "type": "Button",
        "props": { "label": "Submit", "action": "submit" }
      }
    ]
  }
}
```

## Contexts

### StateProvider

Share data across components with JSON Pointer paths:

```tsx
<StateProvider initialState={{ user: { name: "John" } }}>
  {children}
</StateProvider>

// In components:
const { state, get, set } = useStateStore();
const name = get("/user/name");  // "John"
set("/user/age", 25);
```

### ActionProvider

Handle actions from components:

```tsx
<ActionProvider
  onAction={(action) => {
    if (action === "submit") handleSubmit();
    if (action === "cancel") handleCancel();
  }}
>
  {children}
</ActionProvider>
```

### VisibilityProvider

Control element visibility based on data:

```tsx
<VisibilityProvider>
  {children}
</VisibilityProvider>

// Elements can use visibility conditions:
{
  "type": "Alert",
  "props": { "message": "Error!" },
  "visible": { "$state": "/form/hasError" }
}
```

### ValidationProvider

Add field validation:

```tsx
<ValidationProvider>
  {children}
</ValidationProvider>

// Use validation hooks:
const { errors, validate } = useFieldValidation("/form/email", {
  checks: [
    { type: "required", message: "Email required" },
    { type: "email", message: "Invalid email" },
  ],
});
```

## Hooks

| Hook | Purpose |
|------|---------|
| `useStateStore()` | Access data context (`data`, `get`, `set`) |
| `useStateValue(path)` | Get single value from data |
| `useStateBinding(path)` | Two-way data binding (returns `[value, setValue]`) |
| `useVisibility()` | Access visibility evaluation |
| `useIsVisible(condition)` | Check if condition is met |
| `useActions()` | Access action context |
| `useAction(name)` | Get a single action dispatch function |
| `useFieldValidation(path, config)` | Field validation state |
| `useUIStream(options)` | Stream specs from an API endpoint |

## Visibility Conditions

```typescript
// Truthiness check
{ "$state": "/user/isAdmin" }

// Auth state (use state path)
{ "$state": "/auth/isSignedIn" }

// Comparisons (flat style)
{ "$state": "/status", "eq": "active" }
{ "$state": "/count", "gt": 10 }

// Negation
{ "$state": "/maintenance", "not": true }

// Multiple conditions (implicit AND)
[
  { "$state": "/feature/enabled" },
  { "$state": "/maintenance", "not": true }
]

// Always / never
true   // always visible
false  // never visible
```

TypeScript helpers from `@json-render/core`:

```typescript
import { visibility } from "@json-render/core";

visibility.when("/path")       // { $state: "/path" }
visibility.unless("/path")     // { $state: "/path", not: true }
visibility.eq("/path", val)    // { $state: "/path", eq: val }
visibility.neq("/path", val)   // { $state: "/path", neq: val }
visibility.and(cond1, cond2)  // [cond1, cond2]
visibility.always             // true
visibility.never              // false
```

## Dynamic Prop Expressions

Any prop value can use data-driven expressions that resolve at render time. The renderer resolves these transparently before passing props to components.

```json
{
  "type": "Badge",
  "props": {
    "label": { "$state": "/user/role" },
    "color": {
      "$cond": { "$state": "/user/role", "eq": "admin" },
      "$then": "red",
      "$else": "gray"
    }
  }
}
```

See [@json-render/core](../core/README.md) for full expression syntax.

## Built-in Actions

The `setState` action is handled automatically by `ActionProvider`. It updates the state model, which triggers re-evaluation of visibility conditions and dynamic prop expressions:

```json
{
  "type": "Button",
  "props": {
    "label": "Switch Tab",
    "action": "setState",
    "actionParams": { "path": "/activeTab", "value": "settings" }
  }
}
```

## Component Props

When using `defineRegistry`, components receive these props:

```typescript
interface ComponentContext<P> {
  props: P;                    // Typed props from the catalog
  children?: React.ReactNode;  // Rendered children
  emit?: (event: string) => void;  // Emit a named event
  loading?: boolean;           // Whether the parent is loading
}
```

## Generate AI Prompts

```typescript
const systemPrompt = catalog.prompt();
// Returns detailed prompt with component/action descriptions
```

## Full Example

```tsx
import { defineCatalog } from "@json-render/core";
import { schema, defineRegistry, Renderer } from "@json-render/react";
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    Greeting: {
      props: z.object({ name: z.string() }),
      description: "Displays a greeting",
    },
  },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: {
    Greeting: ({ props }) => <h1>Hello, {props.name}!</h1>,
  },
});

const spec = {
  root: {
    type: "Greeting",
    props: { name: "World" },
  },
};

function App() {
  return <Renderer spec={spec} registry={registry} />;
}
```
