import type { VisibilityCondition, StateModel, AuthState } from "./types";
import { getByPath } from "./types";
import { evaluateVisibility, type VisibilityContext } from "./visibility";

// =============================================================================
// Prop Expression Types
// =============================================================================

/**
 * A prop expression that resolves to a value based on state.
 *
 * - `{ $state: string }` reads a value from the state model
 * - `{ $cond, $then, $else }` conditionally picks a value
 * - Any other value is a literal (passthrough)
 */
export type PropExpression<T = unknown> =
  | T
  | { $state: string }
  | { $path: string } // deprecated alias for $state
  | {
      $cond: VisibilityCondition;
      $then: PropExpression<T>;
      $else: PropExpression<T>;
    };

/**
 * Check if a value is a $state expression (or the deprecated $path alias)
 */
function isStateExpression(
  value: unknown,
): value is { $state: string } | { $path: string } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    ("$state" in obj && typeof obj.$state === "string") ||
    ("$path" in obj && typeof obj.$path === "string")
  );
}

/**
 * Get the path string from a $state or $path expression
 */
function getStatePath(value: { $state?: string; $path?: string }): string {
  return (value.$state ?? value.$path)!;
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
 * Recursively resolves $state/$path and $cond/$then/$else expressions.
 */
export function resolvePropValue(
  value: unknown,
  ctx: VisibilityContext,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // $state (or deprecated $path): read from state model
  if (isStateExpression(value)) {
    return getByPath(ctx.stateModel, getStatePath(value));
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
