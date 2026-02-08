import React, { type ReactNode } from "react";
import {
  Renderer,
  DataProvider,
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

  return (
    <DataProvider>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <ValidationProvider>
            <Renderer spec={spec} registry={registry} loading={loading} />
          </ValidationProvider>
        </ActionProvider>
      </VisibilityProvider>
    </DataProvider>
  );
}
