import React, { type ComponentType, type ReactNode, useMemo } from "react";
import type {
  UIElement,
  Spec,
  Action,
  Catalog,
  SchemaDefinition,
  LegacyCatalog,
  ComponentDefinition,
} from "@json-render/core";
import type {
  Components,
  Actions,
  ActionFn,
  SetData,
  DataModel,
} from "./catalog-types";
import { useIsVisible } from "./contexts/visibility";
import { useActions } from "./contexts/actions";
import { useData } from "./contexts/data";
import { DataProvider } from "./contexts/data";
import { VisibilityProvider } from "./contexts/visibility";
import { ActionProvider } from "./contexts/actions";
import { ValidationProvider } from "./contexts/validation";
import { ConfirmDialog } from "./contexts/actions";
import { standardComponents } from "./components/standard";

/**
 * Props passed to component renderers
 */
export interface ComponentRenderProps<P = Record<string, unknown>> {
  /** The element being rendered */
  element: UIElement<string, P>;
  /** Rendered children */
  children?: ReactNode;
  /** Execute an action */
  onAction?: (action: Action) => void;
  /** Whether the parent is loading */
  loading?: boolean;
}

/**
 * Component renderer type
 */
export type ComponentRenderer<P = Record<string, unknown>> = ComponentType<
  ComponentRenderProps<P>
>;

/**
 * Registry of component renderers
 */
export type ComponentRegistry = Record<string, ComponentRenderer<any>>;

/**
 * Props for the Renderer component
 */
export interface RendererProps {
  /** The UI spec to render */
  spec: Spec | null;
  /**
   * Component registry. If omitted, only standard components are used.
   * When provided, custom components are merged with (and override) standard components.
   */
  registry?: ComponentRegistry;
  /** Whether to include standard components (default: true) */
  includeStandard?: boolean;
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
  /** Fallback component for unknown types */
  fallback?: ComponentRenderer;
}

/**
 * Element renderer component
 */
function ElementRenderer({
  element,
  spec,
  registry,
  loading,
  fallback,
}: {
  element: UIElement;
  spec: Spec;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
}) {
  const isVisible = useIsVisible(element.visible);
  const { execute } = useActions();

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Get the component renderer
  const Component = registry[element.type] ?? fallback;

  if (!Component) {
    console.warn(`No renderer for component type: ${element.type}`);
    return null;
  }

  // Render children
  const children = element.children?.map((childKey) => {
    const childElement = spec.elements[childKey];
    if (!childElement) {
      return null;
    }
    return (
      <ElementRenderer
        key={childKey}
        element={childElement}
        spec={spec}
        registry={registry}
        loading={loading}
        fallback={fallback}
      />
    );
  });

  return (
    <Component element={element} onAction={execute} loading={loading}>
      {children}
    </Component>
  );
}

/**
 * Main renderer component.
 *
 * By default, standard React Native components are included.
 * Custom components in `registry` override standard ones with the same name.
 *
 * @example
 * ```tsx
 * // Use standard components only
 * <Renderer spec={spec} />
 *
 * // Add/override components
 * <Renderer spec={spec} registry={{ CustomCard: MyCard }} />
 *
 * // Disable standard components entirely
 * <Renderer spec={spec} registry={myRegistry} includeStandard={false} />
 * ```
 */
export function Renderer({
  spec,
  registry: customRegistry,
  includeStandard = true,
  loading,
  fallback,
}: RendererProps) {
  // Merge standard + custom components (custom overrides standard)
  const registry: ComponentRegistry = useMemo(
    () => ({
      ...(includeStandard ? standardComponents : {}),
      ...customRegistry,
    }),
    [customRegistry, includeStandard],
  );

  if (!spec || !spec.root) {
    return null;
  }

  const rootElement = spec.elements[spec.root];
  if (!rootElement) {
    return null;
  }

  return (
    <ElementRenderer
      element={rootElement}
      spec={spec}
      registry={registry}
      loading={loading}
      fallback={fallback}
    />
  );
}

// Re-export standard components and action handlers
export {
  standardComponents,
  createStandardActionHandlers,
} from "./components/standard";

/**
 * Props for JSONUIProvider
 */
export interface JSONUIProviderProps {
  /**
   * Component registry. If omitted, only standard components are used.
   * Custom components are merged with (and override) standard components.
   */
  registry?: ComponentRegistry;
  /** Initial data model */
  initialData?: Record<string, unknown>;
  /** Auth state */
  authState?: { isSignedIn: boolean; user?: Record<string, unknown> };
  /** Action handlers */
  actionHandlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  /** Navigation function */
  navigate?: (path: string) => void;
  /** Custom validation functions */
  validationFunctions?: Record<
    string,
    (value: unknown, args?: Record<string, unknown>) => boolean
  >;
  /** Callback when data changes */
  onDataChange?: (path: string, value: unknown) => void;
  children: ReactNode;
}

/**
 * Combined provider for all JSONUI contexts
 */
export function JSONUIProvider({
  registry,
  initialData,
  authState,
  actionHandlers,
  navigate,
  validationFunctions,
  onDataChange,
  children,
}: JSONUIProviderProps) {
  return (
    <DataProvider
      initialData={initialData}
      authState={authState}
      onDataChange={onDataChange}
    >
      <VisibilityProvider>
        <ActionProvider handlers={actionHandlers} navigate={navigate}>
          <ValidationProvider customFunctions={validationFunctions}>
            {children}
            <ConfirmationDialogManager />
          </ValidationProvider>
        </ActionProvider>
      </VisibilityProvider>
    </DataProvider>
  );
}

/**
 * Renders the confirmation dialog when needed
 */
function ConfirmationDialogManager() {
  const { pendingConfirmation, confirm, cancel } = useActions();

  if (!pendingConfirmation?.action.confirm) {
    return null;
  }

  return (
    <ConfirmDialog
      confirm={pendingConfirmation.action.confirm}
      onConfirm={confirm}
      onCancel={cancel}
    />
  );
}

/**
 * Legacy helper to create a renderer component from a catalog
 * @deprecated Use createRenderer with the new catalog API instead
 */
export function createRendererFromCatalog<
  C extends LegacyCatalog<Record<string, ComponentDefinition>>,
>(
  _catalog: C,
  registry: ComponentRegistry,
): ComponentType<Omit<RendererProps, "registry">> {
  return function CatalogRenderer(props: Omit<RendererProps, "registry">) {
    return <Renderer {...props} registry={registry} />;
  };
}

// ============================================================================
// defineRegistry
// ============================================================================

/**
 * Result returned by defineRegistry
 */
export interface DefineRegistryResult {
  /** Component registry for `<Renderer registry={...} />` */
  registry: ComponentRegistry;
  /**
   * Create ActionProvider-compatible handlers.
   * Accepts getter functions so handlers always read the latest data/setData
   * (e.g. from React refs).
   */
  handlers: (
    getSetData: () => SetData | undefined,
    getData: () => DataModel,
  ) => Record<string, (params: Record<string, unknown>) => Promise<void>>;
  /**
   * Execute an action by name imperatively
   * (for use outside the React tree, e.g. initial data loading).
   */
  executeAction: (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setData: SetData,
    data?: DataModel,
  ) => Promise<void>;
}

/**
 * Create a registry from a catalog with components and/or actions.
 *
 * @example
 * ```tsx
 * // Components only
 * const { registry } = defineRegistry(catalog, {
 *   components: {
 *     Card: ({ props, children }) => (
 *       <View style={styles.card}><Text>{props.title}</Text>{children}</View>
 *     ),
 *   },
 * });
 *
 * // Actions only
 * const { handlers, executeAction } = defineRegistry(catalog, {
 *   actions: {
 *     viewCustomers: async (params, setData) => { ... },
 *   },
 * });
 *
 * // Both
 * const { registry, handlers, executeAction } = defineRegistry(catalog, {
 *   components: { ... },
 *   actions: { ... },
 * });
 * ```
 */
export function defineRegistry<C extends Catalog>(
  _catalog: C,
  options: {
    components?: Components<C>;
    actions?: Actions<C>;
  },
): DefineRegistryResult {
  // Build component registry
  const registry: ComponentRegistry = {};
  if (options.components) {
    for (const [name, componentFn] of Object.entries(options.components)) {
      registry[name] = ({
        element,
        children,
        onAction,
        loading,
      }: ComponentRenderProps) => {
        return (componentFn as DefineRegistryComponentFn)({
          props: element.props,
          children,
          onAction,
          loading,
        });
      };
    }
  }

  // Build action helpers
  const actionMap = options.actions
    ? (Object.entries(options.actions) as Array<
        [string, DefineRegistryActionFn]
      >)
    : [];

  const handlers = (
    getSetData: () => SetData | undefined,
    getData: () => DataModel,
  ): Record<string, (params: Record<string, unknown>) => Promise<void>> => {
    const result: Record<
      string,
      (params: Record<string, unknown>) => Promise<void>
    > = {};
    for (const [name, actionFn] of actionMap) {
      result[name] = async (params) => {
        const setData = getSetData();
        const data = getData();
        if (setData) {
          await actionFn(params, setData, data);
        }
      };
    }
    return result;
  };

  const executeAction = async (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setData: SetData,
    data: DataModel = {},
  ): Promise<void> => {
    const entry = actionMap.find(([name]) => name === actionName);
    if (entry) {
      await entry[1](params, setData, data);
    } else {
      console.warn(`Unknown action: ${actionName}`);
    }
  };

  return { registry, handlers, executeAction };
}

/** @internal */
type DefineRegistryComponentFn = (ctx: {
  props: unknown;
  children?: React.ReactNode;
  onAction?: (action: Action) => void;
  loading?: boolean;
}) => React.ReactNode;

/** @internal */
type DefineRegistryActionFn = (
  params: Record<string, unknown> | undefined,
  setData: SetData,
  data: DataModel,
) => Promise<void>;

// ============================================================================
// NEW API
// ============================================================================

/**
 * Props for renderers created with createRenderer
 */
export interface CreateRendererProps {
  /** The spec to render (AI-generated JSON) */
  spec: Spec | null;
  /** Data context for dynamic values */
  data?: Record<string, unknown>;
  /** Action handler */
  onAction?: (actionName: string, params?: Record<string, unknown>) => void;
  /** Callback when data changes (e.g., from form inputs) */
  onDataChange?: (path: string, value: unknown) => void;
  /** Whether the spec is currently loading/streaming */
  loading?: boolean;
  /** Auth state for visibility conditions */
  authState?: { isSignedIn: boolean; user?: Record<string, unknown> };
  /** Fallback component for unknown types */
  fallback?: ComponentRenderer;
}

/**
 * Component map type - maps component names to React Native components
 */
export type ComponentMap<
  TComponents extends Record<string, { props: unknown }>,
> = {
  [K in keyof TComponents]: ComponentType<
    ComponentRenderProps<
      TComponents[K]["props"] extends { _output: infer O }
        ? O
        : Record<string, unknown>
    >
  >;
};

/**
 * Create a renderer from a catalog
 *
 * @example
 * ```typescript
 * const DashboardRenderer = createRenderer(dashboardCatalog, {
 *   Card: ({ element, children }) => <View style={styles.card}>{children}</View>,
 *   Metric: ({ element }) => <Text>{element.props.value}</Text>,
 * });
 *
 * // Usage
 * <DashboardRenderer spec={aiGeneratedSpec} data={data} />
 * ```
 */
export function createRenderer<
  TDef extends SchemaDefinition,
  TCatalog extends { components: Record<string, { props: unknown }> },
>(
  catalog: Catalog<TDef, TCatalog>,
  components: ComponentMap<TCatalog["components"]>,
): ComponentType<CreateRendererProps> {
  // Convert component map to registry
  const registry: ComponentRegistry =
    components as unknown as ComponentRegistry;

  // Return the renderer component
  return function CatalogRenderer({
    spec,
    data,
    onAction,
    onDataChange,
    loading,
    authState,
    fallback,
  }: CreateRendererProps) {
    // Wrap onAction to match internal API
    const actionHandlers = onAction
      ? {
          __default__: (params: Record<string, unknown>) => {
            const actionName = params.__actionName__ as string;
            const actionParams = params.__actionParams__ as Record<
              string,
              unknown
            >;
            return onAction(actionName, actionParams);
          },
        }
      : undefined;

    return (
      <DataProvider
        initialData={data}
        authState={authState}
        onDataChange={onDataChange}
      >
        <VisibilityProvider>
          <ActionProvider handlers={actionHandlers}>
            <ValidationProvider>
              <Renderer
                spec={spec}
                registry={registry}
                loading={loading}
                fallback={fallback}
              />
              <ConfirmationDialogManager />
            </ValidationProvider>
          </ActionProvider>
        </VisibilityProvider>
      </DataProvider>
    );
  };
}
