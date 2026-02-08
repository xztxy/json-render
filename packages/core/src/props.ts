import type { VisibilityCondition, StateModel, AuthState } from "./types";
import { getByPath } from "./types";
import { evaluateVisibility, type VisibilityContext } from "./visibility";

// =============================================================================
// Prop Expression Types
// =============================================================================

/**
 * A prop expression that resolves to a value based on state.
 *
 * - `{ $path: string }` reads a value from the state model
 * - `{ $cond, $then, $else }` conditionally picks a value
 * - Any other value is a literal (passthrough)
 */
export type PropExpression<T = unknown> =
  | T
  | { $path: string }
  | {
      $cond: VisibilityCondition;
      $then: PropExpression<T>;
      $else: PropExpression<T>;
    };

/**
 * Check if a value is a $path expression
 */
function isPathExpression(value: unknown): value is { $path: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$path" in value &&
    typeof (value as Record<string, unknown>).$path === "string"
  );
}

/**
 * Check if a value is a $cond expression
 */
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

/**
 * Resolve a single prop value that may contain expressions.
 * Recursively resolves $path and $cond/$then/$else expressions.
 */
export function resolvePropValue(
  value: unknown,
  ctx: VisibilityContext,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // $path: read from state model
  if (isPathExpression(value)) {
    return getByPath(ctx.stateModel, value.$path);
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
  ctx: VisibilityContext,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    resolved[key] = resolvePropValue(value, ctx);
  }
  return resolved;
}
