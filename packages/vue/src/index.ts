// Composables – State
export {
  StateProvider,
  useStateStore,
  useStateValue,
  useStateBinding,
  StateKey,
  type StateContextValue,
  type StateProviderProps,
} from "./composables/state.js";

// Composables – Visibility
export {
  VisibilityProvider,
  useVisibility,
  useIsVisible,
  VisibilityKey,
  type VisibilityContextValue,
} from "./composables/visibility.js";

// Composables – Actions
export {
  ActionProvider,
  useActions,
  useAction,
  ActionKey,
  ConfirmDialog,
  type ActionContextValue,
  type ActionProviderProps,
  type PendingConfirmation,
  type ConfirmDialogProps,
} from "./composables/actions.js";

// Composables – Validation
export {
  ValidationProvider,
  useValidation,
  useOptionalValidation,
  useFieldValidation,
  ValidationKey,
  type ValidationContextValue,
  type ValidationProviderProps,
  type FieldValidationState,
} from "./composables/validation.js";

// Composables – Repeat Scope
export {
  RepeatScopeProvider,
  useRepeatScope,
  RepeatScopeKey,
  type RepeatScopeValue,
} from "./composables/repeat-scope.js";

// Schema (Vue's spec format)
export { schema, type VueSchema, type VueSpec } from "./schema.js";

// Core types (re-exported for convenience)
export type { Spec, StateStore } from "@json-render/core";
export { createStateStore } from "@json-render/core";

// Catalog-aware types for Vue
export type {
  EventHandle,
  BaseComponentProps,
  SetState,
  StateModel,
  ComponentContext,
  ComponentFn,
  Components,
  ActionFn,
  Actions,
} from "./catalog-types.js";

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
} from "./renderer.js";

// Hooks / composables (streaming, chat, spec utilities)
export {
  useUIStream,
  useChatUI,
  useJsonRenderMessage,
  useBoundProp,
  flatToTree,
  buildSpecFromParts,
  getTextFromParts,
  type TokenUsage,
  type UseUIStreamOptions,
  type UseUIStreamReturn,
  type UseChatUIOptions,
  type UseChatUIReturn,
  type ChatMessage,
  type DataPart,
} from "./hooks.js";
