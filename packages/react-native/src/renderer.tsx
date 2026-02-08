import React, {
  type ComponentType,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import type {
  UIElement,
  Spec,
  ActionBinding,
  Catalog,
  SchemaDefinition,
  LegacyCatalog,
  ComponentDefinition,
} from "@json-render/core";
import { resolveElementProps, getByPath } from "@json-render/core";
import type {
  Components,
  Actions,
  ActionFn,
  SetState,
  StateModel,
} from "./catalog-types";
import { useIsVisible, useVisibility } from "./contexts/visibility";
import { useActions } from "./contexts/actions";
import { useStateStore } from "./contexts/state";
import { StateProvider } from "./contexts/state";
import { VisibilityProvider } from "./contexts/visibility";
import { ActionProvider } from "./contexts/actions";
import { ValidationProvider } from "./contexts/validation";
import { ConfirmDialog } from "./contexts/actions";
import { standardComponents } from "./components/standard";
import {
  RepeatScopeProvider,
  useRepeatScope,
  rewriteRepeatTokens,
} from "./contexts/repeat-scope";

/**
 * Props passed to component renderers
 */
export interface ComponentRenderProps<P = Record<string, unknown>> {
  /** The element being rendered */
  element: UIElement<string, P>;
  /** Rendered children */
  children?: ReactNode;
  /** Emit a named event. The renderer resolves the event to action binding(s) from the element's `on` field. */
  emit?: (event: string) => void;
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
  const repeatScope = useRepeatScope();
  const { ctx } = useVisibility();
  const { execute } = useActions();

  // ---- Rewrite $item / $index tokens when inside a Repeat ----
  let effectiveElement = element;
  if (repeatScope) {
    const rewrittenProps = rewriteRepeatTokens(
      element.props,
      repeatScope.basePath,
      repeatScope.index,
    );
    const rewrittenVisible =
      element.visible !== undefined
        ? rewriteRepeatTokens(
            element.visible,
            repeatScope.basePath,
            repeatScope.index,
          )
        : element.visible;
    const rewrittenOn =
      element.on !== undefined
        ? rewriteRepeatTokens(
            element.on,
            repeatScope.basePath,
            repeatScope.index,
          )
        : element.on;
    if (
      rewrittenProps !== element.props ||
      rewrittenVisible !== element.visible ||
      rewrittenOn !== element.on
    ) {
      effectiveElement = {
        ...element,
        props: rewrittenProps as Record<string, unknown>,
        visible: rewrittenVisible as UIElement["visible"],
        on: rewrittenOn as UIElement["on"],
      };
    }
  }

  // Evaluate visibility (after token rewriting so paths are absolute)
  const isVisible = useIsVisible(effectiveElement.visible);

  // Create emit function that resolves events to action bindings.
  // Must be called before any early return to satisfy Rules of Hooks.
  const onBindings = effectiveElement.on;
  const emit = useCallback(
    (eventName: string) => {
      const binding = onBindings?.[eventName];
      if (!binding) return;
      const bindings = Array.isArray(binding) ? binding : [binding];
      for (const b of bindings) {
        execute(b);
      }
    },
    [onBindings, execute],
  );

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Resolve dynamic prop expressions ($path, $cond/$then/$else)
  const resolvedProps = resolveElementProps(
    effectiveElement.props as Record<string, unknown>,
    ctx,
  );
  const resolvedElement =
    resolvedProps !== effectiveElement.props
      ? { ...effectiveElement, props: resolvedProps }
      : effectiveElement;

  // Get the component renderer
  const Component = registry[resolvedElement.type] ?? fallback;

  if (!Component) {
    console.warn(`No renderer for component type: ${resolvedElement.type}`);
    return null;
  }

  // ---- Render children (with repeat support) ----
  const children = resolvedElement.repeat ? (
    <RepeatChildren
      element={resolvedElement}
      spec={spec}
      registry={registry}
      loading={loading}
      fallback={fallback}
    />
  ) : (
    resolvedElement.children?.map((childKey) => {
      const childElement = spec.elements[childKey];
      if (!childElement) {
        if (!loading) {
          console.warn(
            `[json-render] Missing element "${childKey}" referenced as child of "${resolvedElement.type}". This element will not render.`,
          );
        }
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
    })
  );

  return (
    <Component element={resolvedElement} emit={emit} loading={loading}>
      {children}
    </Component>
  );
}

// ---------------------------------------------------------------------------
// RepeatChildren -- renders child elements once per item in a state array.
// Used when an element has a `repeat` field.
// ---------------------------------------------------------------------------

function RepeatChildren({
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
  const { state } = useStateStore();
  const repeat = element.repeat!;
  const statePath = repeat.path;

  const items = (getByPath(state, statePath) as unknown[] | undefined) ?? [];

  return (
    <>
      {items.map((item, index) => {
        // Use a stable key: prefer key field, fall back to index
        const key =
          repeat.key && typeof item === "object" && item !== null
            ? String((item as Record<string, unknown>)[repeat.key] ?? index)
            : String(index);

        return (
          <RepeatScopeProvider
            key={key}
            basePath={`${statePath}/${index}`}
            index={index}
          >
            {element.children?.map((childKey) => {
              const childElement = spec.elements[childKey];
              if (!childElement) {
                if (!loading) {
                  console.warn(
                    `[json-render] Missing element "${childKey}" referenced as child of "${element.type}" (repeat). This element will not render.`,
                  );
                }
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
            })}
          </RepeatScopeProvider>
        );
      })}
    </>
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
  /** Initial state model */
  initialState?: Record<string, unknown>;
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
  /** Callback when state changes */
  onStateChange?: (path: string, value: unknown) => void;
  children: ReactNode;
}

/**
 * Combined provider for all JSONUI contexts
 */
export function JSONUIProvider({
  registry,
  initialState,
  authState,
  actionHandlers,
  navigate,
  validationFunctions,
  onStateChange,
  children,
}: JSONUIProviderProps) {
  return (
    <StateProvider
      initialState={initialState}
      authState={authState}
      onStateChange={onStateChange}
    >
      <VisibilityProvider>
        <ActionProvider handlers={actionHandlers} navigate={navigate}>
          <ValidationProvider customFunctions={validationFunctions}>
            {children}
            <ConfirmationDialogManager />
          </ValidationProvider>
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
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
   * Accepts getter functions so handlers always read the latest state/setState
   * (e.g. from React refs).
   */
  handlers: (
    getSetState: () => SetState | undefined,
    getState: () => StateModel,
  ) => Record<string, (params: Record<string, unknown>) => Promise<void>>;
  /**
   * Execute an action by name imperatively
   * (for use outside the React tree, e.g. initial state loading).
   */
  executeAction: (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setState: SetState,
    state?: StateModel,
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
 *     viewCustomers: async (params, setState) => { ... },
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
        emit,
        loading,
      }: ComponentRenderProps) => {
        return (componentFn as DefineRegistryComponentFn)({
          props: element.props,
          children,
          emit,
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
    getSetState: () => SetState | undefined,
    getState: () => StateModel,
  ): Record<string, (params: Record<string, unknown>) => Promise<void>> => {
    const result: Record<
      string,
      (params: Record<string, unknown>) => Promise<void>
    > = {};
    for (const [name, actionFn] of actionMap) {
      result[name] = async (params) => {
        const setState = getSetState();
        const state = getState();
        if (setState) {
          await actionFn(params, setState, state);
        }
      };
    }
    return result;
  };

  const executeAction = async (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setState: SetState,
    state: StateModel = {},
  ): Promise<void> => {
    const entry = actionMap.find(([name]) => name === actionName);
    if (entry) {
      await entry[1](params, setState, state);
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
  emit?: (event: string) => void;
  loading?: boolean;
}) => React.ReactNode;

/** @internal */
type DefineRegistryActionFn = (
  params: Record<string, unknown> | undefined,
  setState: SetState,
  state: StateModel,
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
  /** State context for dynamic values */
  state?: Record<string, unknown>;
  /** Action handler */
  onAction?: (actionName: string, params?: Record<string, unknown>) => void;
  /** Callback when state changes (e.g., from form inputs) */
  onStateChange?: (path: string, value: unknown) => void;
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
 * <DashboardRenderer spec={aiGeneratedSpec} state={state} />
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
    state,
    onAction,
    onStateChange,
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
      <StateProvider
        initialState={state}
        authState={authState}
        onStateChange={onStateChange}
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
      </StateProvider>
    );
  };
}
