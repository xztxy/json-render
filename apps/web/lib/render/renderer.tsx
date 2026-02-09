"use client";

import type { ReactNode } from "react";
import {
  Renderer,
  type Spec,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";

import { registry, Fallback } from "./registry";

// =============================================================================
// PlaygroundRenderer
// =============================================================================

interface PlaygroundRendererProps {
  spec: Spec | null;
  data?: Record<string, unknown>;
  loading?: boolean;
}

const fallbackRenderer = (renderProps: { element: { type: string } }) => (
  <Fallback type={renderProps.element.type} />
);

export function PlaygroundRenderer({
  spec,
  data,
  loading,
}: PlaygroundRendererProps): ReactNode {
  if (!spec) return null;

  return (
    <StateProvider initialState={data ?? spec.state}>
      <VisibilityProvider>
        <ActionProvider>
          <Renderer
            spec={spec}
            registry={registry}
            fallback={fallbackRenderer}
            loading={loading}
          />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
