import { z } from "zod";
import type { VisibilityCondition, StateCondition, StateModel } from "./types";
import { getByPath } from "./types";

// =============================================================================
// Schemas
// =============================================================================

/**
 * Schema for a single state condition.
 */
const StateConditionSchema = z.object({
  $state: z.string(),
  eq: z.unknown().optional(),
  neq: z.unknown().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  not: z.literal(true).optional(),
});

/**
 * Visibility condition schema.
 */
export const VisibilityConditionSchema: z.ZodType<VisibilityCondition> =
  z.union([z.boolean(), StateConditionSchema, z.array(StateConditionSchema)]);

// =============================================================================
// Context
// =============================================================================

/**
 * Context for evaluating visibility conditions.
 */
export interface VisibilityContext {
  stateModel: StateModel;
}

// =============================================================================
// Evaluation
// =============================================================================

/**
 * Resolve a comparison value. If it's a `{ $state }` reference, look it up;
 * otherwise return the literal.
 */
function resolveComparisonValue(
  value: unknown,
  stateModel: StateModel,
): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    "$state" in value &&
    typeof (value as Record<string, unknown>).$state === "string"
  ) {
    return getByPath(stateModel, (value as { $state: string }).$state);
  }
  return value;
}

/**
 * Evaluate a single state condition against the state model.
 */
function evaluateCondition(
  cond: StateCondition,
  stateModel: StateModel,
): boolean {
  const value = getByPath(stateModel, cond.$state);

  // Equality
  if (cond.eq !== undefined) {
    const rhs = resolveComparisonValue(cond.eq, stateModel);
    return value === rhs;
  }

  // Inequality
  if (cond.neq !== undefined) {
    const rhs = resolveComparisonValue(cond.neq, stateModel);
    return value !== rhs;
  }

  // Greater than
  if (cond.gt !== undefined) {
    const rhs = resolveComparisonValue(cond.gt, stateModel);
    if (typeof value === "number" && typeof rhs === "number") {
      return value > rhs;
    }
    return false;
  }

  // Greater than or equal
  if (cond.gte !== undefined) {
    const rhs = resolveComparisonValue(cond.gte, stateModel);
    if (typeof value === "number" && typeof rhs === "number") {
      return value >= rhs;
    }
    return false;
  }

  // Less than
  if (cond.lt !== undefined) {
    const rhs = resolveComparisonValue(cond.lt, stateModel);
    if (typeof value === "number" && typeof rhs === "number") {
      return value < rhs;
    }
    return false;
  }

  // Less than or equal
  if (cond.lte !== undefined) {
    const rhs = resolveComparisonValue(cond.lte, stateModel);
    if (typeof value === "number" && typeof rhs === "number") {
      return value <= rhs;
    }
    return false;
  }

  // Negation (truthiness inverted)
  if (cond.not === true) {
    return !Boolean(value);
  }

  // Truthiness
  return Boolean(value);
}

/**
 * Evaluate a visibility condition.
 *
 * - `undefined` → visible
 * - `boolean` → that value
 * - `StateCondition` → evaluate single condition
 * - `StateCondition[]` → implicit AND (all must be true)
 */
export function evaluateVisibility(
  condition: VisibilityCondition | undefined,
  ctx: VisibilityContext,
): boolean {
  // No condition = visible
  if (condition === undefined) {
    return true;
  }

  // Boolean literal
  if (typeof condition === "boolean") {
    return condition;
  }

  // Array = implicit AND
  if (Array.isArray(condition)) {
    return condition.every((c) => evaluateCondition(c, ctx.stateModel));
  }

  // Single condition
  return evaluateCondition(condition, ctx.stateModel);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Helper to create visibility conditions.
 */
export const visibility = {
  /** Always visible */
  always: true as const,

  /** Never visible */
  never: false as const,

  /** Visible when state path is truthy */
  when: (path: string): StateCondition => ({ $state: path }),

  /** Visible when state path is falsy */
  unless: (path: string): StateCondition => ({ $state: path, not: true }),

  /** Equality check */
  eq: (path: string, value: unknown): StateCondition => ({
    $state: path,
    eq: value,
  }),

  /** Not equal check */
  neq: (path: string, value: unknown): StateCondition => ({
    $state: path,
    neq: value,
  }),

  /** Greater than */
  gt: (path: string, value: number): StateCondition => ({
    $state: path,
    gt: value,
  }),

  /** Greater than or equal */
  gte: (path: string, value: number): StateCondition => ({
    $state: path,
    gte: value,
  }),

  /** Less than */
  lt: (path: string, value: number): StateCondition => ({
    $state: path,
    lt: value,
  }),

  /** Less than or equal */
  lte: (path: string, value: number): StateCondition => ({
    $state: path,
    lte: value,
  }),

  /** AND multiple conditions */
  and: (...conditions: StateCondition[]): StateCondition[] => conditions,
};
