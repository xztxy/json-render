// Schema
export { schema, type ReactPdfSchema, type ReactPdfSpec } from "./schema";

// Core types (re-exported for convenience)
export type { Spec } from "@json-render/core";

// Catalog-aware types
export type {
  SetState,
  StateModel,
  ComponentContext,
  ComponentFn,
  Components,
  ActionFn,
  Actions,
} from "./catalog-types";

// Contexts
export {
  StateProvider,
  useStateStore,
  useStateValue,
  useStateBinding,
  type StateContextValue,
  type StateProviderProps,
} from "./contexts/state";

export {
  VisibilityProvider,
  useVisibility,
  useIsVisible,
  type VisibilityContextValue,
  type VisibilityProviderProps,
} from "./contexts/visibility";

export {
  ActionProvider,
  useActions,
  useAction,
  ConfirmDialog,
  type ActionContextValue,
  type ActionProviderProps,
  type PendingConfirmation,
  type ConfirmDialogProps,
} from "./contexts/actions";

export {
  ValidationProvider,
  useValidation,
  useFieldValidation,
  type ValidationContextValue,
  type ValidationProviderProps,
  type FieldValidationState,
} from "./contexts/validation";

export {
  RepeatScopeProvider,
  useRepeatScope,
  type RepeatScopeValue,
} from "./contexts/repeat-scope";

// Renderer
export {
  defineRegistry,
  type DefineRegistryResult,
  createRenderer,
  type CreateRendererProps,
  type ComponentMap,
  Renderer,
  JSONUIProvider,
  type ComponentRenderProps,
  type ComponentRenderer,
  type ComponentRegistry,
  type RendererProps,
  type JSONUIProviderProps,
  standardComponents,
} from "./renderer";

// Server-side render functions
export {
  renderToBuffer,
  renderToStream,
  renderToFile,
  type RenderOptions,
} from "./render";

// Catalog definitions
export {
  standardComponentDefinitions,
  type StandardComponentDefinitions,
  type StandardComponentProps,
} from "./catalog";
