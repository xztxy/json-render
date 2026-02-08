import React, { type ReactNode, useMemo } from "react";
import {
  Renderer,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
  ValidationProvider,
  type Spec,
} from "@json-render/react-native";
import { registry } from "./registry";

// =============================================================================
// AppRenderer
// =============================================================================

interface AppRendererProps {
  spec: Spec | null;
  loading?: boolean;
}

export function AppRenderer({ spec, loading }: AppRendererProps): ReactNode {
  if (!spec) return null;

  // Seed the StateProvider with any initial state from the spec.
  // Memoize so we only pick up the state from the first render of this spec
  // (otherwise re-renders during streaming would keep resetting the state).
  const initialState = useMemo(
    () => spec?.state ?? {},
    // Re-seed when the spec root changes (new generation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec?.root],
  );

  return (
    <StateProvider initialState={initialState}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <ValidationProvider>
            <Renderer spec={spec} registry={registry} loading={loading} />
          </ValidationProvider>
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
