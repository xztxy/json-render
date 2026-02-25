import {
  defineComponent,
  h,
  provide,
  inject,
  ref,
  type InjectionKey,
  type PropType,
} from "vue";
import {
  resolveAction,
  executeAction,
  type ActionBinding,
  type ActionHandler,
  type ActionConfirm,
  type ResolvedAction,
} from "@json-render/core";
import { useStateStore } from "./state.js";
import { useOptionalValidation } from "./validation.js";

function generateUniqueId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deepResolveValue(
  value: unknown,
  get: (path: string) => unknown,
): unknown {
  if (value === null || value === undefined) return value;

  if (value === "$id") {
    return generateUniqueId();
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 1 && typeof obj.$state === "string") {
      return get(obj.$state as string);
    }

    if (keys.length === 1 && "$id" in obj) {
      return generateUniqueId();
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepResolveValue(item, get));
  }

  if (typeof value === "object") {
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      resolved[key] = deepResolveValue(val, get);
    }
    return resolved;
  }

  return value;
}

export interface PendingConfirmation {
  action: ResolvedAction;
  handler: ActionHandler;
  resolve: () => void;
  reject: () => void;
}

export interface ActionContextValue {
  handlers: Record<string, ActionHandler>;
  loadingActions: Set<string>;
  pendingConfirmation: PendingConfirmation | null;
  execute: (binding: ActionBinding) => Promise<void>;
  confirm: () => void;
  cancel: () => void;
  registerHandler: (name: string, handler: ActionHandler) => void;
}

export const ActionKey: InjectionKey<ActionContextValue> = Symbol(
  "json-render-actions",
);

export interface ActionProviderProps {
  handlers?: Record<string, ActionHandler>;
  navigate?: (path: string) => void;
}

export const ActionProvider = defineComponent({
  name: "ActionProvider",
  props: {
    handlers: {
      type: Object as PropType<Record<string, ActionHandler>>,
      default: () => ({}),
    },
    navigate: {
      type: Function as PropType<(path: string) => void>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const storeCtx = useStateStore();
    const validation = useOptionalValidation();

    const handlersRef = ref<Record<string, ActionHandler>>({
      ...props.handlers,
    });
    const loadingActionsRef = ref<Set<string>>(new Set());
    const pendingConfirmationRef = ref<PendingConfirmation | null>(null);

    const registerHandler = (name: string, handler: ActionHandler) => {
      handlersRef.value = { ...handlersRef.value, [name]: handler };
    };

    const execute = async (binding: ActionBinding) => {
      const resolved = resolveAction(binding, storeCtx.getSnapshot());

      if (resolved.action === "setState" && resolved.params) {
        const statePath = resolved.params.statePath as string;
        const value = resolved.params.value;
        if (statePath) {
          storeCtx.set(statePath, value);
        }
        return;
      }

      if (resolved.action === "pushState" && resolved.params) {
        const statePath = resolved.params.statePath as string;
        const rawValue = resolved.params.value;
        if (statePath) {
          const resolvedValue = deepResolveValue(rawValue, storeCtx.get);
          const arr = (storeCtx.get(statePath) as unknown[] | undefined) ?? [];
          storeCtx.set(statePath, [...arr, resolvedValue]);
          const clearStatePath = resolved.params.clearStatePath as
            | string
            | undefined;
          if (clearStatePath) {
            storeCtx.set(clearStatePath, "");
          }
        }
        return;
      }

      if (resolved.action === "removeState" && resolved.params) {
        const statePath = resolved.params.statePath as string;
        const index = resolved.params.index as number;
        if (statePath !== undefined && index !== undefined) {
          const arr = (storeCtx.get(statePath) as unknown[] | undefined) ?? [];
          storeCtx.set(
            statePath,
            arr.filter((_, i) => i !== index),
          );
        }
        return;
      }

      if (resolved.action === "push" && resolved.params) {
        const screen = resolved.params.screen as string;
        if (screen) {
          const currentScreen = storeCtx.get("/currentScreen") as
            | string
            | undefined;
          const navStack =
            (storeCtx.get("/navStack") as string[] | undefined) ?? [];
          if (currentScreen) {
            storeCtx.set("/navStack", [...navStack, currentScreen]);
          } else {
            storeCtx.set("/navStack", [...navStack, ""]);
          }
          storeCtx.set("/currentScreen", screen);
        }
        return;
      }

      if (resolved.action === "pop") {
        const navStack =
          (storeCtx.get("/navStack") as string[] | undefined) ?? [];
        if (navStack.length > 0) {
          const previousScreen = navStack[navStack.length - 1];
          storeCtx.set("/navStack", navStack.slice(0, -1));
          if (previousScreen) {
            storeCtx.set("/currentScreen", previousScreen);
          } else {
            storeCtx.set("/currentScreen", undefined);
          }
        }
        return;
      }

      if (resolved.action === "validateForm") {
        const validateAll = validation?.validateAll;
        if (!validateAll) {
          console.warn(
            "validateForm action was dispatched but no ValidationProvider is connected.",
          );
          return;
        }
        const valid = validateAll();
        const statePath =
          (resolved.params?.statePath as string) || "/formValidation";
        storeCtx.set(statePath, { valid });
        return;
      }

      const handler = handlersRef.value[resolved.action];

      if (!handler) {
        console.warn(`No handler registered for action: ${resolved.action}`);
        return;
      }

      if (resolved.confirm) {
        return new Promise<void>((resolve, reject) => {
          pendingConfirmationRef.value = {
            action: resolved,
            handler,
            resolve: () => {
              pendingConfirmationRef.value = null;
              resolve();
            },
            reject: () => {
              pendingConfirmationRef.value = null;
              reject(new Error("Action cancelled"));
            },
          };
        }).then(async () => {
          const next = new Set(loadingActionsRef.value);
          next.add(resolved.action);
          loadingActionsRef.value = next;
          try {
            await executeAction({
              action: resolved,
              handler,
              setState: storeCtx.set,
              navigate: props.navigate,
              executeAction: async (name) => {
                const subBinding: ActionBinding = { action: name };
                await execute(subBinding);
              },
            });
          } finally {
            const fin = new Set(loadingActionsRef.value);
            fin.delete(resolved.action);
            loadingActionsRef.value = fin;
          }
        });
      }

      const next = new Set(loadingActionsRef.value);
      next.add(resolved.action);
      loadingActionsRef.value = next;
      try {
        await executeAction({
          action: resolved,
          handler,
          setState: storeCtx.set,
          navigate: props.navigate,
          executeAction: async (name) => {
            const subBinding: ActionBinding = { action: name };
            await execute(subBinding);
          },
        });
      } finally {
        const fin = new Set(loadingActionsRef.value);
        fin.delete(resolved.action);
        loadingActionsRef.value = fin;
      }
    };

    const confirm = () => {
      pendingConfirmationRef.value?.resolve();
    };

    const cancel = () => {
      pendingConfirmationRef.value?.reject();
    };

    const ctx: ActionContextValue = {
      get handlers() {
        return handlersRef.value;
      },
      get loadingActions() {
        return loadingActionsRef.value;
      },
      get pendingConfirmation() {
        return pendingConfirmationRef.value;
      },
      execute,
      confirm,
      cancel,
      registerHandler,
    };

    provide(ActionKey, ctx);

    return () => slots.default?.();
  },
});

export function useActions(): ActionContextValue {
  const ctx = inject(ActionKey);
  if (!ctx) {
    throw new Error("useActions must be used within an ActionProvider");
  }
  return ctx;
}

export function useAction(binding: ActionBinding): {
  execute: () => Promise<void>;
  isLoading: boolean;
} {
  const { execute, loadingActions } = useActions();

  return {
    execute: () => execute(binding),
    get isLoading() {
      return loadingActions.has(binding.action);
    },
  };
}

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------

export interface ConfirmDialogProps {
  confirm: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = defineComponent({
  name: "ConfirmDialog",
  props: {
    confirm: {
      type: Object as PropType<ConfirmDialogProps["confirm"]>,
      required: true,
    },
    onConfirm: { type: Function as PropType<() => void>, required: true },
    onCancel: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    return () => {
      const isDanger = props.confirm.variant === "danger";

      return h(
        "div",
        {
          style: {
            position: "fixed",
            inset: "0",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          },
          onClick: props.onCancel,
        },
        [
          h(
            "div",
            {
              style: {
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "24px",
                maxWidth: "400px",
                width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              },
              onClick: (e: Event) => e.stopPropagation(),
            },
            [
              h(
                "h3",
                {
                  style: {
                    margin: "0 0 8px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                  },
                },
                props.confirm.title,
              ),
              h(
                "p",
                {
                  style: { margin: "0 0 24px 0", color: "#6b7280" },
                },
                props.confirm.message,
              ),
              h(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end",
                  },
                },
                [
                  h(
                    "button",
                    {
                      onClick: props.onCancel,
                      style: {
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        backgroundColor: "white",
                        cursor: "pointer",
                      },
                    },
                    props.confirm.cancelLabel ?? "Cancel",
                  ),
                  h(
                    "button",
                    {
                      onClick: props.onConfirm,
                      style: {
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: isDanger ? "#dc2626" : "#3b82f6",
                        color: "white",
                        cursor: "pointer",
                      },
                    },
                    props.confirm.confirmLabel ?? "Confirm",
                  ),
                ],
              ),
            ],
          ),
        ],
      );
    };
  },
});
