"use client";

import { useMemo, useRef, type ReactNode } from "react";
import {
  defineRegistry,
  Renderer,
  type ComponentRenderer,
  type Spec,
  DataProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";

import { dashboardCatalog } from "./catalog";
import { components, Fallback } from "./catalog/components";
import { actionHandlers, executeAction } from "./catalog/actions";

// =============================================================================
// Registry - created once from the catalog and component map
// =============================================================================

const registry = defineRegistry(dashboardCatalog, components);

// =============================================================================
// DashboardRenderer
// =============================================================================

type SetData = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

interface DashboardRendererProps {
  spec: Spec | null;
  data?: Record<string, unknown>;
  setData?: SetData;
  onDataChange?: (path: string, value: unknown) => void;
  loading?: boolean;
}

// Fallback component for unknown types
const fallback: ComponentRenderer = ({ element }) => (
  <Fallback type={element.type} />
);

export function DashboardRenderer({
  spec,
  data = {},
  setData,
  onDataChange,
  loading,
}: DashboardRendererProps): ReactNode {
  // Use refs so action handlers always see the latest data/setData
  const dataRef = useRef(data);
  const setDataRef = useRef(setData);
  dataRef.current = data;
  setDataRef.current = setData;

  // Create ActionProvider-compatible handlers that delegate to the
  // dashboard's executeAction (which needs setData + data from refs)
  const handlers = useMemo(() => {
    const result: Record<
      string,
      (params: Record<string, unknown>) => Promise<void>
    > = {};
    for (const name of Object.keys(actionHandlers)) {
      result[name] = async (params) => {
        const sd = setDataRef.current;
        const d = dataRef.current;
        if (sd) {
          await executeAction(name, params, sd, d);
        }
      };
    }
    return result;
  }, []);

  if (!spec) return null;

  return (
    <DataProvider initialData={data} onDataChange={onDataChange}>
      <VisibilityProvider>
        <ActionProvider handlers={handlers}>
          <Renderer
            spec={spec}
            registry={registry}
            fallback={fallback}
            loading={loading}
          />
        </ActionProvider>
      </VisibilityProvider>
    </DataProvider>
  );
}
