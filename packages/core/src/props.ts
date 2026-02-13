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
 * - `{ $item: string }` reads a value from the current repeat item
 * - `{ $index: true }` returns the current repeat array index
 * - `{ $cond, $then, $else }` conditionally picks a value
 * - Any other value is a literal (passthrough)
 */
export type PropExpression<T = unknown> =
  | T
  | { $state: string }
  | { $item: string }
  | { $index: true }
  | {
      $cond: VisibilityCondition;
      $then: PropExpression<T>;
      $else: PropExpression<T>;
    };

/**
 * Context for resolving prop expressions.
 * Extends VisibilityContext with optional repeat scope.
 */
export interface PropResolutionContext extends VisibilityContext {
  /** The current repeat item object (set inside a repeat) */
  repeatItem?: unknown;
  /** The current repeat array index (set inside a repeat) */
  repeatIndex?: number;
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
 * Handles $state, $item, $index, and $cond/$then/$else in a single pass.
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
