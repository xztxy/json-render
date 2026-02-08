import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "Registry | json-render",
};

export default function RegistryPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Registry</h1>
      <p className="text-muted-foreground mb-8">
        Register React components and action handlers to bring your catalog to
        life.
      </p>

      {/* defineRegistry */}
      <h2 className="text-xl font-semibold mt-12 mb-4">defineRegistry</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use <code>defineRegistry</code> to create a type-safe registry from your
        catalog. Pass your components, actions, or both in a single call:
      </p>
      <Code lang="tsx">{`import { defineRegistry } from '@json-render/react';
import { myCatalog } from './catalog';

export const { registry, handlers, executeAction } = defineRegistry(myCatalog, {
  components: {
    Card: ({ props, children }) => (
      <div className="card">
        <h2>{props.title}</h2>
        {props.description && <p>{props.description}</p>}
        {children}
      </div>
    ),

    Button: ({ props, onAction }) => (
      <button onClick={() => onAction?.({ name: props.action })}>
        {props.label}
      </button>
    ),
  },

  actions: {
    submit_form: async (params, setState) => {
      const res = await fetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      const result = await res.json();
      setState((prev) => ({ ...prev, formResult: result }));
    },

    export_data: async (params) => {
      const blob = await generateExport(params.format);
      downloadBlob(blob, \`export.\${params.format}\`);
    },
  },
});`}</Code>

      <p className="text-sm text-muted-foreground mt-4 mb-4">
        The returned object contains:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground mb-4 space-y-1">
        <li>
          <code>registry</code> - component registry for{" "}
          <code>{"<Renderer />"}</code>
        </li>
        <li>
          <code>handlers</code> - factory for ActionProvider-compatible handlers
        </li>
        <li>
          <code>executeAction</code> - imperative action dispatch (for use
          outside the React tree)
        </li>
      </ul>

      {/* Component Props */}
      <h2 className="text-xl font-semibold mt-12 mb-4">Component Props</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Each component in the registry receives a <code>ComponentContext</code>{" "}
        object:
      </p>
      <Code lang="typescript">{`interface ComponentContext {
  props: T;                    // Type-safe props from your catalog
  children?: React.ReactNode;  // Rendered children (for slot components)
  onAction?: (action: ActionTrigger) => void;  // Dispatch an action
  loading?: boolean;           // Whether the renderer is in a loading state
}`}</Code>

      <p className="text-sm text-muted-foreground mt-4 mb-4">
        Props are automatically inferred from your catalog, so{" "}
        <code>props.title</code> is typed as <code>string</code> if your catalog
        defines it that way.
      </p>

      {/* Action Handlers */}
      <h2 className="text-xl font-semibold mt-12 mb-4">Action Handlers</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Instead of AI generating arbitrary code, it declares <em>intent</em> by
        name. Your application provides the implementation. This is a core
        guardrail.
      </p>

      <h3 className="text-lg font-medium mt-8 mb-3">Defining Actions</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Define available actions in your catalog:
      </p>
      <Code lang="typescript">{`import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react';
import { z } from 'zod';

const catalog = defineCatalog(schema, {
  components: { /* ... */ },
  actions: {
    submit_form: {
      params: z.object({
        formId: z.string(),
      }),
      description: 'Submit a form',
    },
    export_data: {
      params: z.object({
        format: z.enum(['csv', 'pdf', 'json']),
      }),
    },
    navigate: {
      params: z.object({
        url: z.string(),
      }),
    },
  },
});`}</Code>

      <h3 className="text-lg font-medium mt-8 mb-3">
        Implementing Action Handlers
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Action handlers receive <code>(params, setState, data)</code> and are
        defined inside <code>defineRegistry</code>:
      </p>
      <Code lang="tsx">{`export const { handlers, executeAction } = defineRegistry(catalog, {
  actions: {
    submit_form: async (params, setState) => {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify({ formId: params.formId }),
      });
      const result = await response.json();
      setState((prev) => ({ ...prev, formResult: result }));
    },

    export_data: async (params) => {
      const blob = await generateExport(params.format);
      downloadBlob(blob, \`export.\${params.format}\`);
    },

    navigate: (params) => {
      window.location.href = params.url;
    },
  },
});`}</Code>

      {/* Using Data Binding */}
      <h2 className="text-xl font-semibold mt-12 mb-4">Using Data Binding</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use hooks inside your registry components to read and write data:
      </p>
      <Code lang="tsx">{`import { useStateStore } from '@json-render/react';
import { getByPath } from '@json-render/core';

// Inside defineRegistry components:

Metric: ({ props }) => {
  const { data } = useStateStore();
  const value = getByPath(data, props.valuePath);

  return (
    <div className="metric">
      <span className="label">{props.label}</span>
      <span className="value">{formatValue(value)}</span>
    </div>
  );
},

TextField: ({ props }) => {
  const { data, set } = useStateStore();
  const value = getByPath(data, props.valuePath) as string;

  return (
    <input
      value={value || ''}
      onChange={(e) => set(props.valuePath, e.target.value)}
      placeholder={props.placeholder}
    />
  );
},`}</Code>

      {/* Renderer Section */}
      <h2 className="text-xl font-semibold mt-12 mb-4">Using the Renderer</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Wire everything together with providers and the{" "}
        <code>{"<Renderer />"}</code> component:
      </p>
      <Code lang="tsx">{`import { useMemo, useRef } from 'react';
import {
  Renderer,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from '@json-render/react';
import { registry, handlers } from './registry';

function App({ spec, data, setState }) {
  const dataRef = useRef(data);
  const setStateRef = useRef(setState);
  dataRef.current = data;
  setStateRef.current = setState;

  const actionHandlers = useMemo(
    () => handlers(() => setStateRef.current, () => dataRef.current),
    [],
  );

  return (
    <StateProvider initialState={data}>
      <VisibilityProvider>
        <ActionProvider handlers={actionHandlers}>
          <Renderer spec={spec} registry={registry} />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next</h2>
      <p className="text-sm text-muted-foreground">
        Learn about{" "}
        <Link
          href="/docs/data-binding"
          className="text-foreground hover:underline"
        >
          data binding
        </Link>{" "}
        for dynamic values.
      </p>
    </article>
  );
}
