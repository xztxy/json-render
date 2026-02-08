import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import {
  resolveAction,
  executeAction,
  type Action,
  type ActionHandler,
  type ActionConfirm,
  type ResolvedAction,
} from "@json-render/core";
import { useStateStore } from "./state";

/**
 * Deep-resolve dynamic value references ({ path: "/..." }) within an object.
 * This allows pushState values to contain references to current state.
 */
function deepResolveValue(
  value: unknown,
  get: (path: string) => unknown,
): unknown {
  if (value === null || value === undefined) return value;

  // { path: "/foo" } -> read from state
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    "path" in (value as Record<string, unknown>)
  ) {
    const obj = value as Record<string, unknown>;
    // Only treat as a path reference if it has exactly one key
    if (Object.keys(obj).length === 1 && typeof obj.path === "string") {
      return get(obj.path as string);
    }
  }

  // Recurse into arrays
  if (Array.isArray(value)) {
    return value.map((item) => deepResolveValue(item, get));
  }

  // Recurse into plain objects
  if (typeof value === "object") {
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      resolved[key] = deepResolveValue(val, get);
    }
    return resolved;
  }

  return value;
}

/**
 * Pending confirmation state
 */
export interface PendingConfirmation {
  /** The resolved action */
  action: ResolvedAction;
  /** The action handler */
  handler: ActionHandler;
  /** Resolve callback */
  resolve: () => void;
  /** Reject callback */
  reject: () => void;
}

/**
 * Action context value
 */
export interface ActionContextValue {
  /** Registered action handlers */
  handlers: Record<string, ActionHandler>;
  /** Currently loading action names */
  loadingActions: Set<string>;
  /** Pending confirmation dialog */
  pendingConfirmation: PendingConfirmation | null;
  /** Execute an action */
  execute: (action: Action) => Promise<void>;
  /** Confirm the pending action */
  confirm: () => void;
  /** Cancel the pending action */
  cancel: () => void;
  /** Register an action handler */
  registerHandler: (name: string, handler: ActionHandler) => void;
}

const ActionContext = createContext<ActionContextValue | null>(null);

/**
 * Props for ActionProvider
 */
export interface ActionProviderProps {
  /** Initial action handlers */
  handlers?: Record<string, ActionHandler>;
  /** Navigation function */
  navigate?: (path: string) => void;
  children: ReactNode;
}

/**
 * Provider for action execution
 */
export function ActionProvider({
  handlers: initialHandlers = {},
  navigate,
  children,
}: ActionProviderProps) {
  const { state, get, set } = useStateStore();
  const [handlers, setHandlers] =
    useState<Record<string, ActionHandler>>(initialHandlers);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  const registerHandler = useCallback(
    (name: string, handler: ActionHandler) => {
      setHandlers((prev) => ({ ...prev, [name]: handler }));
    },
    [],
  );

  const execute = useCallback(
    async (action: Action) => {
      const resolved = resolveAction(action, state);

      // Built-in: setState updates the StateProvider state directly
      if (resolved.name === "setState" && resolved.params) {
        const path = resolved.params.path as string;
        const value = resolved.params.value;
        if (path) {
          set(path, value);
        }
        return;
      }

      // Built-in: pushState appends an item to an array in state.
      // Supports dynamic values inside the value object via { path: "/..." } syntax.
      if (resolved.name === "pushState" && resolved.params) {
        const path = resolved.params.path as string;
        const rawValue = resolved.params.value;
        if (path) {
          const resolvedValue = deepResolveValue(rawValue, get);
          const arr = (get(path) as unknown[] | undefined) ?? [];
          set(path, [...arr, resolvedValue]);
          // Optionally clear a path after pushing (e.g. clear the input)
          const clearPath = resolved.params.clearPath as string | undefined;
          if (clearPath) {
            set(clearPath, "");
          }
        }
        return;
      }

      // Built-in: removeState removes an item from an array in state by index.
      if (resolved.name === "removeState" && resolved.params) {
        const path = resolved.params.path as string;
        const index = resolved.params.index as number;
        if (path !== undefined && index !== undefined) {
          const arr = (get(path) as unknown[] | undefined) ?? [];
          set(
            path,
            arr.filter((_, i) => i !== index),
          );
        }
        return;
      }

      // Built-in: push navigates to a new screen by updating state.
      // Pushes the current screen onto /navStack and sets /currentScreen.
      if (resolved.name === "push" && resolved.params) {
        const screen = resolved.params.screen as string;
        if (screen) {
          const currentScreen = get("/currentScreen") as string | undefined;
          const navStack = (get("/navStack") as string[] | undefined) ?? [];
          if (currentScreen) {
            set("/navStack", [...navStack, currentScreen]);
          } else {
            // No current screen set yet — push a sentinel so pop returns here
            set("/navStack", [...navStack, ""]);
          }
          set("/currentScreen", screen);
        }
        return;
      }

      // Built-in: pop navigates back to the previous screen.
      // Pops the last entry from /navStack and restores /currentScreen.
      if (resolved.name === "pop") {
        const navStack = (get("/navStack") as string[] | undefined) ?? [];
        if (navStack.length > 0) {
          const previousScreen = navStack[navStack.length - 1];
          set("/navStack", navStack.slice(0, -1));
          if (previousScreen) {
            set("/currentScreen", previousScreen);
          } else {
            // Sentinel empty string = clear currentScreen (return to default)
            set("/currentScreen", undefined);
          }
        }
        return;
      }

      const handler = handlers[resolved.name];

      if (!handler) {
        console.warn(`No handler registered for action: ${resolved.name}`);
        return;
      }

      // If confirmation is required, show dialog
      if (resolved.confirm) {
        return new Promise<void>((resolve, reject) => {
          setPendingConfirmation({
            action: resolved,
            handler,
            resolve: () => {
              setPendingConfirmation(null);
              resolve();
            },
            reject: () => {
              setPendingConfirmation(null);
              reject(new Error("Action cancelled"));
            },
          });
        }).then(async () => {
          setLoadingActions((prev) => new Set(prev).add(resolved.name));
          try {
            await executeAction({
              action: resolved,
              handler,
              setState: set,
              navigate,
              executeAction: async (name) => {
                const subAction: Action = { name };
                await execute(subAction);
              },
            });
          } finally {
            setLoadingActions((prev) => {
              const next = new Set(prev);
              next.delete(resolved.name);
              return next;
            });
          }
        });
      }

      // Execute immediately
      setLoadingActions((prev) => new Set(prev).add(resolved.name));
      try {
        await executeAction({
          action: resolved,
          handler,
          setState: set,
          navigate,
          executeAction: async (name) => {
            const subAction: Action = { name };
            await execute(subAction);
          },
        });
      } finally {
        setLoadingActions((prev) => {
          const next = new Set(prev);
          next.delete(resolved.name);
          return next;
        });
      }
    },
    [state, handlers, get, set, navigate],
  );

  const confirm = useCallback(() => {
    pendingConfirmation?.resolve();
  }, [pendingConfirmation]);

  const cancel = useCallback(() => {
    pendingConfirmation?.reject();
  }, [pendingConfirmation]);

  const value = useMemo<ActionContextValue>(
    () => ({
      handlers,
      loadingActions,
      pendingConfirmation,
      execute,
      confirm,
      cancel,
      registerHandler,
    }),
    [
      handlers,
      loadingActions,
      pendingConfirmation,
      execute,
      confirm,
      cancel,
      registerHandler,
    ],
  );

  return (
    <ActionContext.Provider value={value}>{children}</ActionContext.Provider>
  );
}

/**
 * Hook to access action context
 */
export function useActions(): ActionContextValue {
  const ctx = useContext(ActionContext);
  if (!ctx) {
    throw new Error("useActions must be used within an ActionProvider");
  }
  return ctx;
}

/**
 * Hook to execute an action
 */
export function useAction(action: Action): {
  execute: () => Promise<void>;
  isLoading: boolean;
} {
  const { execute, loadingActions } = useActions();
  const isLoading = loadingActions.has(action.name);

  const executeAction = useCallback(() => execute(action), [execute, action]);

  return { execute: executeAction, isLoading };
}

/**
 * Props for ConfirmDialog component
 */
export interface ConfirmDialogProps {
  /** The confirmation config */
  confirm: ActionConfirm;
  /** Called when confirmed */
  onConfirm: () => void;
  /** Called when cancelled */
  onCancel: () => void;
}

/**
 * Default confirmation dialog component for React Native
 */
export function ConfirmDialog({
  confirm,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = confirm.variant === "danger";

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={styles.title}>{confirm.title}</Text>
          <Text style={styles.message}>{confirm.message}</Text>
          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>
                {confirm.cancelLabel ?? "Cancel"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.confirmButton,
                isDanger && styles.confirmButtonDanger,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>
                {confirm.confirmLabel ?? "Confirm"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 24,
    maxWidth: 400,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "white",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#374151",
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
  },
  confirmButtonDanger: {
    backgroundColor: "#dc2626",
  },
  confirmButtonText: {
    fontSize: 14,
    color: "white",
  },
});
