/**
 * L2 kernel geometry — zero dependencies, zero React.
 *
 * These types describe backend-neutral query intent (`CollectionRequest`) and
 * query results (`CollectionPage`). URL-serializable `CollectionState` lives
 * here too, but it is deliberately a different shape from the request.
 */

/** Scope values are strings; a declared scope key that is absent/undefined is "not ready". */
export type Scope = Readonly<Record<string, string | undefined>>;

/** Opaque continuation token. Client-side adapters may synthesize one. */
export type Cursor = string;

export type Operator = "eq" | "ne" | "contains" | "in" | "gt" | "lt" | "gte" | "lte" | "exists";

export type FieldValue = string | number | boolean | readonly string[];

/** URL/state-side filter leaf. The request side uses `Predicate`. */
export interface FilterValue {
  field: string;
  op: Operator;
  value: FieldValue;
}

export interface Sort {
  field: string;
  dir: "asc" | "desc";
}

/** URL/state-side page intent. */
export type PageState =
  | { kind: "cursor"; cursor?: Cursor }
  | { kind: "offset"; offset: number }
  | { kind: "all" };

/** URL-serializable collection state (q/filters/sort/page/size). */
export interface CollectionState {
  q?: string;
  filters?: readonly FilterValue[];
  sort?: readonly Sort[];
  page?: PageState;
  size?: number;
}

/** Request-side predicate tree. OR is allowed in requests, not in URL state. */
export type Predicate =
  | { field: string; op: Operator; value: FieldValue }
  | { all: readonly Predicate[] }
  | { any: readonly Predicate[] };

/** Request-side paging window (discriminated union, no optional "kind" field). */
export type CollectionWindow =
  | { kind: "cursor"; size: number; cursor?: Cursor }
  | { kind: "offset"; size: number; offset: number }
  | { kind: "all"; size?: number };

export interface CollectionRequest {
  where?: Predicate;
  order?: readonly Sort[];
  window: CollectionWindow;
}

export interface CollectionPage<T> {
  rows: readonly T[];
  paging:
    | { kind: "cursor"; nextCursor?: Cursor; total?: number }
    | { kind: "offset"; total: number; offset: number; size: number }
    | { kind: "all"; total: number };
}

export type QueryKind = "collection" | "record" | "lookup";
