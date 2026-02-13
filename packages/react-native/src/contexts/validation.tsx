import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  runValidation,
  type ValidationConfig,
  type ValidationFunction,
  type ValidationResult,
} from "@json-render/core";
import { useStateStore } from "./state";

/**
 * Field validation state
 */
export interface FieldValidationState {
  /** Whether the field has been touched */
  touched: boolean;
  /** Whether the field has been validated */
  validated: boolean;
  /** Validation result */
  result: ValidationResult | null;
}

/**
 * Validation context value
 */
export interface ValidationContextValue {
  /** Custom validation functions from catalog */
  customFunctions: Record<string, ValidationFunction>;
  /** Validation state by field path */
  fieldStates: Record<string, FieldValidationState>;
  /** Validate a field */
  validate: (path: string, config: ValidationConfig) => ValidationResult;
  /** Mark field as touched */
  touch: (path: string) => void;
  /** Clear validation for a field */
  clear: (path: string) => void;
  /** Validate all fields */
  validateAll: () => boolean;
  /** Register field config */
  registerField: (path: string, config: ValidationConfig) => void;
}

const ValidationContext = createContext<ValidationContextValue | null>(null);

/**
 * Props for ValidationProvider
 */
export interface ValidationProviderProps {
  /** Custom validation functions from catalog */
  customFunctions?: Record<string, ValidationFunction>;
  children: ReactNode;
}

/**
 * Structural equality check for ValidationConfig.
 * Avoids JSON.stringify which is sensitive to key ordering.
 */
function validationConfigEqual(
  a: ValidationConfig,
  b: ValidationConfig,
): boolean {
  if (a === b) return true;

  // Compare validateOn
  if (a.validateOn !== b.validateOn) return false;

  // Compare checks arrays
  const ac = a.checks ?? [];
  const bc = b.checks ?? [];
  if (ac.length !== bc.length) return false;

  for (let i = 0; i < ac.length; i++) {
    const ca = ac[i]!;
    const cb = bc[i]!;
    if (ca.type !== cb.type) return false;
    if (ca.message !== cb.message) return false;
    // Compare args by stringifying (small objects, order-insensitive is overkill here)
    const argsA = ca.args ? JSON.stringify(ca.args) : undefined;
    const argsB = cb.args ? JSON.stringify(cb.args) : undefined;
    if (argsA !== argsB) return false;
  }

  return true;
}

/**
 * Provider for validation
 */
export function ValidationProvider({
  customFunctions = {},
  children,
}: ValidationProviderProps) {
  const { state } = useStateStore();
  const [fieldStates, setFieldStates] = useState<
    Record<string, FieldValidationState>
  >({});
  const [fieldConfigs, setFieldConfigs] = useState<
    Record<string, ValidationConfig>
  >({});

  const registerField = useCallback(
    (path: string, config: ValidationConfig) => {
      setFieldConfigs((prev) => {
        const existing = prev[path];
        // Bail out (return same reference) if config is unchanged to avoid
        // infinite re-render loops when callers pass a fresh object each render.
        if (existing && validationConfigEqual(existing, config)) {
          return prev;
        }
        return { ...prev, [path]: config };
      });
    },
    [],
  );

  const validate = useCallback(
    (path: string, config: ValidationConfig): ValidationResult => {
      // Walk the nested state object using JSON Pointer segments
      const segments = path.split("/").filter(Boolean);
      let value: unknown = state;
      for (const seg of segments) {
        if (value != null && typeof value === "object") {
          value = (value as Record<string, unknown>)[seg];
        } else {
          value = undefined;
          break;
        }
      }
      const result = runValidation(config, {
        value,
        stateModel: state,
        customFunctions,
      });

      setFieldStates((prev) => ({
        ...prev,
        [path]: {
          touched: prev[path]?.touched ?? true,
          validated: true,
          result,
        },
      }));

      return result;
    },
    [state, customFunctions],
  );

  const touch = useCallback((path: string) => {
    setFieldStates((prev) => ({
      ...prev,
      [path]: {
        ...prev[path],
        touched: true,
        validated: prev[path]?.validated ?? false,
        result: prev[path]?.result ?? null,
      },
    }));
  }, []);

  const clear = useCallback((path: string) => {
    setFieldStates((prev) => {
      const { [path]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const validateAll = useCallback(() => {
    let allValid = true;

    for (const [path, config] of Object.entries(fieldConfigs)) {
      const result = validate(path, config);
      if (!result.valid) {
        allValid = false;
      }
    }

    return allValid;
  }, [fieldConfigs, validate]);

  const value = useMemo<ValidationContextValue>(
    () => ({
      customFunctions,
      fieldStates,
      validate,
      touch,
      clear,
      validateAll,
      registerField,
    }),
    [
      customFunctions,
      fieldStates,
      validate,
      touch,
      clear,
      validateAll,
      registerField,
    ],
  );

  return (
    <ValidationContext.Provider value={value}>
      {children}
    </ValidationContext.Provider>
  );
}

/**
 * Hook to access validation context
 */
export function useValidation(): ValidationContextValue {
  const ctx = useContext(ValidationContext);
  if (!ctx) {
    throw new Error("useValidation must be used within a ValidationProvider");
  }
  return ctx;
}

/**
 * Hook to get validation state for a field
 */
export function useFieldValidation(
  path: string,
  config?: ValidationConfig,
): {
  state: FieldValidationState;
  validate: () => ValidationResult;
  touch: () => void;
  clear: () => void;
  errors: string[];
  isValid: boolean;
} {
  const {
    fieldStates,
    validate: validateField,
    touch: touchField,
    clear: clearField,
    registerField,
  } = useValidation();

  // Register field on mount
  React.useEffect(() => {
    if (config) {
      registerField(path, config);
    }
  }, [path, config, registerField]);

  const state = fieldStates[path] ?? {
    touched: false,
    validated: false,
    result: null,
  };

  const validate = useCallback(
    () => validateField(path, config ?? { checks: [] }),
    [path, config, validateField],
  );

  const touch = useCallback(() => touchField(path), [path, touchField]);
  const clear = useCallback(() => clearField(path), [path, clearField]);

  return {
    state,
    validate,
    touch,
    clear,
    errors: state.result?.errors ?? [],
    isValid: state.result?.valid ?? true,
  };
}
