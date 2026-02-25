import {
  defineComponent,
  provide,
  inject,
  ref,
  watchEffect,
  type InjectionKey,
  type PropType,
} from "vue";
import {
  runValidation,
  type ValidationConfig,
  type ValidationFunction,
  type ValidationResult,
} from "@json-render/core";
import { useStateStore } from "./state.js";

export interface FieldValidationState {
  touched: boolean;
  validated: boolean;
  result: ValidationResult | null;
}

export interface ValidationContextValue {
  customFunctions: Record<string, ValidationFunction>;
  fieldStates: Record<string, FieldValidationState>;
  validate: (path: string, config: ValidationConfig) => ValidationResult;
  touch: (path: string) => void;
  clear: (path: string) => void;
  validateAll: () => boolean;
  registerField: (path: string, config: ValidationConfig) => void;
}

export const ValidationKey: InjectionKey<ValidationContextValue> = Symbol(
  "json-render-validation",
);

export interface ValidationProviderProps {
  customFunctions?: Record<string, ValidationFunction>;
}

export const ValidationProvider = defineComponent({
  name: "ValidationProvider",
  props: {
    customFunctions: {
      type: Object as PropType<Record<string, ValidationFunction>>,
      default: () => ({}),
    },
  },
  setup(props, { slots }) {
    const storeCtx = useStateStore();
    const fieldStates = ref<Record<string, FieldValidationState>>({});
    const fieldConfigs = ref<Record<string, ValidationConfig>>({});

    const registerField = (path: string, config: ValidationConfig) => {
      fieldConfigs.value = { ...fieldConfigs.value, [path]: config };
    };

    const validate = (
      path: string,
      config: ValidationConfig,
    ): ValidationResult => {
      const currentState = storeCtx.getSnapshot();
      const segments = path.split("/").filter(Boolean);
      let value: unknown = currentState;
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
        stateModel: currentState,
        customFunctions: props.customFunctions,
      });

      fieldStates.value = {
        ...fieldStates.value,
        [path]: {
          touched: fieldStates.value[path]?.touched ?? true,
          validated: true,
          result,
        },
      };

      return result;
    };

    const touch = (path: string) => {
      const existing = fieldStates.value[path];
      fieldStates.value = {
        ...fieldStates.value,
        [path]: {
          touched: true,
          validated: existing?.validated ?? false,
          result: existing?.result ?? null,
        },
      };
    };

    const clear = (path: string) => {
      const { [path]: _, ...rest } = fieldStates.value;
      fieldStates.value = rest;
    };

    const validateAll = (): boolean => {
      let allValid = true;
      for (const [path, config] of Object.entries(fieldConfigs.value)) {
        const result = validate(path, config);
        if (!result.valid) {
          allValid = false;
        }
      }
      return allValid;
    };

    const ctx: ValidationContextValue = {
      get customFunctions() {
        return props.customFunctions;
      },
      get fieldStates() {
        return fieldStates.value;
      },
      validate,
      touch,
      clear,
      validateAll,
      registerField,
    };

    provide(ValidationKey, ctx);

    return () => slots.default?.();
  },
});

export function useValidation(): ValidationContextValue {
  const ctx = inject(ValidationKey);
  if (!ctx) {
    throw new Error("useValidation must be used within a ValidationProvider");
  }
  return ctx;
}

export function useOptionalValidation(): ValidationContextValue | null {
  return inject(ValidationKey, null);
}

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

  if (path && config) {
    watchEffect(() => {
      registerField(path, config);
    });
  }

  const state = fieldStates[path] ?? {
    touched: false,
    validated: false,
    result: null,
  };

  return {
    get state() {
      return (
        fieldStates[path] ?? { touched: false, validated: false, result: null }
      );
    },
    validate: () => validateField(path, config ?? { checks: [] }),
    touch: () => touchField(path),
    clear: () => clearField(path),
    get errors() {
      return (fieldStates[path] ?? state).result?.errors ?? [];
    },
    get isValid() {
      return (fieldStates[path] ?? state).result?.valid ?? true;
    },
  };
}
