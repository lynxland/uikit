import type { FilterValue, Predicate } from "../kernel";

/**
 * Predicate <-> filter-value projection helpers used by filter UIs and by
 * pages that keep a single-value filter model.
 */

/** Flatten AND/OR trees into their field leaves (projection only, no serialization). */
export function filterLeaves(predicate: Predicate | null | undefined): readonly FilterValue[] {
  if (predicate === null || predicate === undefined) return [];
  if ("field" in predicate) return [predicate];
  if ("all" in predicate) return predicate.all.flatMap(filterLeaves);
  return predicate.any.flatMap(filterLeaves);
}

/** field -> single value (array-valued `in` leaves are skipped). */
export function filterValues(
  predicate: Predicate | null | undefined,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const leaf of filterLeaves(predicate)) {
    if (typeof leaf.value !== "object") out[leaf.field] = leaf.value;
  }
  return out;
}

/** Canonical predicate from leaves: 0 -> null, 1 -> leaf, n -> AND. */
export function predicateOf(parts: readonly Predicate[]): Predicate | null {
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0] ?? null;
  return { all: [...parts] };
}

/** Convenience constructor for the most common filter leaf. */
export function eqFilter(field: string, value: string | number | boolean): Predicate {
  return { field, op: "eq", value };
}
