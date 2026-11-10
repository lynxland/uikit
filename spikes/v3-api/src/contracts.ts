export type Cursor = string;
export type Scope = Readonly<Record<string, string | undefined>>;

export type Operator =
  | "eq"
  | "ne"
  | "contains"
  | "in"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "exists";

export type FieldValue = string | number | boolean | readonly string[];

export type Predicate =
  | { field: string; op: Operator; value: FieldValue }
  | { all: readonly Predicate[] }
  | { any: readonly Predicate[] };

export type Sort = { field: string; dir: "asc" | "desc" };

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
