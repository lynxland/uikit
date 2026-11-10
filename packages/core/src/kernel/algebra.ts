import type {
  CollectionPage,
  CollectionRequest,
  CollectionWindow,
  FieldValue,
  Predicate,
  Sort,
} from "./types";

// ============ Predicate evaluation (pure) ============

function fieldOf(row: unknown, field: string): unknown {
  return (row as Record<string, unknown>)[field];
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b));
}

function contains(value: unknown, needle: FieldValue): boolean {
  return String(value ?? "")
    .toLowerCase()
    .includes(String(needle).toLowerCase());
}

export function evalPredicate(predicate: Predicate | undefined, row: unknown): boolean {
  if (predicate === undefined) return true;
  if ("all" in predicate) return predicate.all.every((p) => evalPredicate(p, row));
  if ("any" in predicate) return predicate.any.some((p) => evalPredicate(p, row));
  const value = fieldOf(row, predicate.field);
  switch (predicate.op) {
    case "eq":
      return value === predicate.value;
    case "ne":
      return value !== predicate.value;
    case "contains":
      return contains(value, predicate.value);
    case "in":
      return Array.isArray(predicate.value) && predicate.value.includes(value as string);
    case "gt":
      return compare(value, predicate.value) > 0;
    case "lt":
      return compare(value, predicate.value) < 0;
    case "gte":
      return compare(value, predicate.value) >= 0;
    case "lte":
      return compare(value, predicate.value) <= 0;
    case "exists":
      return value !== undefined && value !== null;
    default:
      return false;
  }
}

/** Text search: q is an OR of contains across the whitelisted fields. */
export function textPredicate(fields: readonly string[], q: string): Predicate | undefined {
  const text = q.trim();
  if (text === "" || fields.length === 0) return undefined;
  return {
    any: fields.map((field) => ({ field, op: "contains" as const, value: text })),
  };
}

// ============ Client-side cursor algebra ============

export function encodeClientCursor(offset: number): string {
  return `c${offset.toString(36)}`;
}

export function decodeClientCursor(cursor: string): number | null {
  if (!cursor.startsWith("c")) return null;
  const value = Number.parseInt(cursor.slice(1), 36);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function offsetOf(window: CollectionWindow): number {
  if (window.kind === "offset") return window.offset;
  if (window.kind === "cursor" && window.cursor !== undefined) {
    return decodeClientCursor(window.cursor) ?? 0;
  }
  return 0;
}

// ============ Client-side query evaluation ============

/** Evaluate a request locally over the full row set (clientCollection core). */
export function evaluateQuery<T>(
  request: CollectionRequest,
  rows: readonly T[],
): CollectionPage<T> {
  const filtered = request.where
    ? rows.filter((row) => evalPredicate(request.where, row))
    : [...rows];

  const ordered = request.order?.length
    ? [...filtered].sort((a, b) => {
        for (const sort of request.order ?? []) {
          const result = compare(fieldOf(a, sort.field), fieldOf(b, sort.field));
          if (result !== 0) return sort.dir === "desc" ? -result : result;
        }
        return 0;
      })
    : filtered;

  const window = request.window;

  if (window.kind === "all") {
    return { rows: ordered, paging: { kind: "all", total: ordered.length } };
  }

  if (window.kind === "offset") {
    const size = Math.max(0, window.size);
    const offset = Math.max(0, window.offset);
    return {
      rows: ordered.slice(offset, offset + size),
      paging: { kind: "offset", total: ordered.length, offset, size },
    };
  }

  const size = Math.max(0, window.size);
  const offset = offsetOf(window);
  const nextOffset = offset + size;
  return {
    rows: ordered.slice(offset, nextOffset),
    paging: {
      kind: "cursor",
      ...(nextOffset < ordered.length ? { nextCursor: encodeClientCursor(nextOffset) } : {}),
    },
  };
}

// ============ Cursor advance ============

/**
 * Compute the next/previous request window.
 *
 * Server-issued opaque cursors cannot be decoded locally, so cursor prev
 * returns null; URL bindings delegate that case to browser history.
 */
export function advance(
  window: CollectionWindow,
  page: CollectionPage<unknown>,
  dir: "next" | "prev",
): CollectionWindow | null {
  if (window.kind === "all") return null;

  if (dir === "next") {
    if (page.paging.kind === "cursor") {
      if (page.paging.nextCursor === undefined) return null;
      return { kind: "cursor", size: window.size, cursor: page.paging.nextCursor };
    }
    if (page.paging.kind === "offset") {
      const currentOffset = window.kind === "offset" ? window.offset : page.paging.offset;
      const offset = currentOffset + window.size;
      if (offset >= page.paging.total) return null;
      return { kind: "offset", size: window.size, offset };
    }
    return null;
  }

  if (window.kind === "offset") {
    if (window.offset <= 0) return null;
    return {
      kind: "offset",
      size: window.size,
      offset: Math.max(0, window.offset - window.size),
    };
  }

  const offset = offsetOf(window);
  if (window.cursor === undefined || offset < window.size) return null;
  return {
    kind: "cursor",
    size: window.size,
    cursor: encodeClientCursor(offset - window.size),
  };
}

export function orderEquals(
  a: readonly Sort[] | undefined,
  b: readonly Sort[] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((sort, index) => {
    const other = b[index];
    return other !== undefined && sort.field === other.field && sort.dir === other.dir;
  });
}
