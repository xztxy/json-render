import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "Data Binding | json-render",
};

export default function DataBindingPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Data Binding</h1>
      <p className="text-muted-foreground mb-8">
        Connect UI components to your application data using JSON Pointer paths.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">JSON Pointer Paths</h2>
      <p className="text-sm text-muted-foreground mb-4">
        json-render uses JSON Pointer (RFC 6901) for data paths:
      </p>
      <Code lang="json">{`// Given this data:
{
  "user": {
    "name": "Alice",
    "email": "alice@example.com"
  },
  "metrics": {
    "revenue": 125000,
    "growth": 0.15
  }
}

// These paths access:
"/user/name"        -> "Alice"
"/metrics/revenue"  -> 125000
"/metrics/growth"   -> 0.15`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">StateProvider</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Wrap your app with StateProvider to enable data binding:
      </p>
      <Code lang="tsx">{`import { StateProvider } from '@json-render/react';

function App() {
  const initialState = {
    user: { name: 'Alice' },
    form: { email: '', message: '' },
  };

  return (
    <StateProvider initialState={initialState}>
      {/* Your UI */}
    </StateProvider>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Reading Data</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use <code className="text-foreground">useStateValue</code> for read-only
        access:
      </p>
      <Code lang="tsx">{`import { useStateValue } from '@json-render/react';

function UserGreeting() {
  const name = useStateValue('/user/name');
  return <h1>Hello, {name}!</h1>;
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Two-Way Binding</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use <code className="text-foreground">useStateBinding</code> for
        read-write access:
      </p>
      <Code lang="tsx">{`import { useStateBinding } from '@json-render/react';

function EmailInput() {
  const [email, setEmail] = useStateBinding('/form/email');
  
  return (
    <input
      type="email"
      value={email || ''}
      onChange={(e) => setEmail(e.target.value)}
    />
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Using the State Context
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Access the full state context for advanced use cases:
      </p>
      <Code lang="tsx">{`import { useStateStore } from '@json-render/react';

function StateDebugger() {
  const { data, setState, getValue, setValue } = useStateStore();
  
  // Read any path
  const revenue = getValue('/metrics/revenue');
  
  // Write any path
  const updateRevenue = () => setValue('/metrics/revenue', 150000);
  
  // Replace all state
  const resetState = () => setState({ user: {}, form: {} });
  
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">In JSON UI Trees</h2>
      <p className="text-sm text-muted-foreground mb-4">
        AI can reference data paths in component props:
      </p>
      <Code lang="json">{`{
  "type": "Metric",
  "props": {
    "label": "Total Revenue",
    "valuePath": "/metrics/revenue",
    "format": "currency"
  }
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next</h2>
      <p className="text-sm text-muted-foreground">
        Learn about{" "}
        <Link href="/docs/actions" className="text-foreground hover:underline">
          actions
        </Link>{" "}
        for user interactions.
      </p>
    </article>
  );
}
