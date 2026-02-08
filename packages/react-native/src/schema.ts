import { defineSchema } from "@json-render/core";

/**
 * The schema for @json-render/react-native
 *
 * Defines:
 * - Spec: A flat tree of elements with keys, types, props, and children references
 * - Catalog: Components with props schemas, and optional actions
 */
export const schema = defineSchema((s) => ({
  // What the AI-generated SPEC looks like
  spec: s.object({
    /** Root element key */
    root: s.string(),
    /** Flat map of elements by key */
    elements: s.record(
      s.object({
        /** Component type from catalog */
        type: s.ref("catalog.components"),
        /** Component props */
        props: s.propsOf("catalog.components"),
        /** Child element keys (flat reference) */
        children: s.array(s.string()),
        /** Visibility condition */
        visible: s.any(),
      }),
    ),
  }),

  // What the CATALOG must provide
  catalog: s.object({
    /** Component definitions */
    components: s.map({
      /** Zod schema for component props */
      props: s.zod(),
      /** Slots for this component. Use ['default'] for children, or named slots like ['header', 'footer'] */
      slots: s.array(s.string()),
      /** Description for AI generation hints */
      description: s.string(),
    }),
    /** Action definitions (optional) */
    actions: s.map({
      /** Zod schema for action params */
      params: s.zod(),
      /** Description for AI generation hints */
      description: s.string(),
    }),
  }),
}));

/**
 * Type for the React Native schema
 */
export type ReactNativeSchema = typeof schema;

/**
 * Infer the spec type from a catalog
 */
export type ReactNativeSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;

// Backward compatibility aliases
/** @deprecated Use `schema` instead */
export const elementTreeSchema = schema;
/** @deprecated Use `ReactNativeSchema` instead */
export type ElementTreeSchema = ReactNativeSchema;
/** @deprecated Use `ReactNativeSpec` instead */
export type ElementTreeSpec<T> = ReactNativeSpec<T>;
