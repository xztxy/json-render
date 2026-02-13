import type { VisibilityCondition, StateModel } from "./types";
import { getByPath } from "./types";
import { evaluateVisibility, type VisibilityContext } from "./visibility";

// =============================================================================
// Prop Expression Types
// =============================================================================

/**
 * A prop expression that resolves to a value based on state.
 *
 * - `{ $state: string }` reads a value from the global state model
 * - `{ $item: string }` reads a field from the current repeat item (path
 *    into the item object; use `"/"` for the whole item)
 * - `{ $index: true }` returns the current repeat array index. Uses `true`
 *    as a sentinel flag because the index is a scalar with no sub-path to
 *    navigate — unlike `$item` which needs a path into the item object.
 * - `{ $bind: string }` two-way binding — resolves to the value at the
 *    state path (like `$state`) AND exposes the resolved path so the
 *    component can write back. Use `"$item/field"` prefix inside repeat
 *    scopes (rewritten to the absolute path automatically).
 * - `{ $cond, $then, $else }` conditionally picks a value
 * - Any other value is a literal (passthrough)
 */
export type PropExpression<T = unknown> =
  | T
  | { $state: string }
  | { $item: string }
  | { $index: true }
  | { $bind: string }
  | {
      $cond: VisibilityCondition;
      $then: PropExpression<T>;
      $else: PropExpression<T>;
    };

/**
 * Context for resolving prop expressions.
 * Extends {@link VisibilityContext} with an optional `repeatBasePath` used
 * to rewrite `$item` prefixes in `$bind` paths to absolute state paths.
 */
export interface PropResolutionContext extends VisibilityContext {
  /** Absolute state path to the current repeat item (e.g. "/todos/0"). Set inside repeat scopes. */
  repeatBasePath?: string;
}

// =============================================================================
// Type Guards
// =============================================================================

function isStateExpression(value: unknown): value is { $state: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$state" in value &&
    typeof (value as Record<string, unknown>).$state === "string"
  );
}

function isItemExpression(value: unknown): value is { $item: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$item" in value &&
    typeof (value as Record<string, unknown>).$item === "string"
  );
}

function isIndexExpression(value: unknown): value is { $index: true } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$index" in value &&
    (value as Record<string, unknown>).$index === true
  );
}

function isBindExpression(value: unknown): value is { $bind: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$bind" in value &&
    typeof (value as Record<string, unknown>).$bind === "string"
  );
}

function isCondExpression(
  value: unknown,
): value is { $cond: VisibilityCondition; $then: unknown; $else: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$cond" in value &&
    "$then" in value &&
    "$else" in value
  );
}

// =============================================================================
// Prop Expression Resolution
// =============================================================================

// =============================================================================
// $bind path resolution helper
// =============================================================================

/**
 * Resolve a `$bind` path string into an absolute state path.
 *
 * Inside a repeat scope, `"$item/field"` is rewritten to
 * `"{repeatBasePath}/field"` (e.g. `"/todos/0/field"`).
 * Outside a repeat scope, the path is returned as-is.
 */
function resolveBindPath(raw: string, ctx: PropResolutionContext): string {
  if (raw === "$item") {
    return ctx.repeatBasePath ?? raw;
  }
  if (raw.startsWith("$item/")) {
    const suffix = raw.slice("$item".length); // e.g. "/completed"
    return ctx.repeatBasePath != null ? ctx.repeatBasePath + suffix : raw;
  }
  return raw;
}

// =============================================================================
// Prop Expression Resolution
// =============================================================================

/**
 * Resolve a single prop value that may contain expressions.
 * Handles $state, $item, $index, $bind, and $cond/$then/$else in a single pass.
 */
export function resolvePropValue(
  value: unknown,
  ctx: PropResolutionContext,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // $state: read from global state model
  if (isStateExpression(value)) {
    return getByPath(ctx.stateModel, value.$state);
  }

  // $item: read from current repeat item
  if (isItemExpression(value)) {
    if (ctx.repeatItem === undefined) return undefined;
    // "/" means the whole item, "/field" means a field on the item
    return value.$item === "/"
      ? ctx.repeatItem
      : getByPath(ctx.repeatItem, value.$item);
  }

  // $index: return current repeat array index
  if (isIndexExpression(value)) {
    return ctx.repeatIndex;
  }

  // $bind: two-way binding — resolve path, then read value from state
  if (isBindExpression(value)) {
    const resolvedPath = resolveBindPath(value.$bind, ctx);
    return getByPath(ctx.stateModel, resolvedPath);
  }

  // $cond/$then/$else: evaluate condition and pick branch
  if (isCondExpression(value)) {
    const result = evaluateVisibility(value.$cond, ctx);
    return resolvePropValue(result ? value.$then : value.$else, ctx);
  }

  // Arrays: resolve each element
  if (Array.isArray(value)) {
    return value.map((item) => resolvePropValue(item, ctx));
  }

  // Plain objects (not expressions): resolve each value recursively
  if (typeof value === "object") {
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      resolved[key] = resolvePropValue(val, ctx);
    }
    return resolved;
  }

  // Primitive literal: passthrough
  return value;
}

/**
 * Resolve all prop values in an element's props object.
 * Returns a new props object with all expressions resolved.
 */
export function resolveElementProps(
  props: Record<string, unknown>,
  ctx: PropResolutionContext,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    resolved[key] = resolvePropValue(value, ctx);
  }
  return resolved;
}

/**
 * Scan an element's raw props for `$bind` expressions and return a map
 * of prop name → resolved state path.
 *
 * This is called **before** `resolveElementProps` so the component can
 * receive both the resolved value (in `props`) and the write-back path
 * (in `bindings`).
 *
 * @example
 * ```ts
 * const rawProps = { value: { $bind: "/form/email" }, label: "Email" };
 * const bindings = resolveBindings(rawProps, ctx);
 * // bindings = { value: "/form/email" }
 * ```
 */
export function resolveBindings(
  props: Record<string, unknown>,
  ctx: PropResolutionContext,
): Record<string, string> | undefined {
  let bindings: Record<string, string> | undefined;
  for (const [key, value] of Object.entries(props)) {
    if (isBindExpression(value)) {
      const resolvedPath = resolveBindPath(value.$bind, ctx);
      if (!bindings) bindings = {};
      bindings[key] = resolvedPath;
    }
  }
  return bindings;
}
