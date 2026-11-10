import type {
  CollectionRequest,
  CollectionState,
  CollectionWindow,
  FilterValue,
  Operator,
  PageState,
  Predicate,
  Sort,
} from "../kernel";
import { textPredicate } from "../kernel";

/**
 * CollectionState URL codec.
 *
 * URL keys: q / filter=field:op:value / sort=field:dir / cursor / page /
 * size. Arrays use repeated keys; parseSearch normalizes scalars/arrays in
 * decode. Unknown search params always pass through.
 */

export interface FilterFieldDef {
  field: string;
  /** Default "eq". */
  op?: Operator;
  label?: string;
  kind?: "text" | "exact" | "enum" | "datetime";
  options?: readonly { value: string; label: string }[];
}

export interface CollectionSearchSpec {
  /** Fields q expands to (OR of contains). */
  text?: readonly string[];
  filters?: readonly FilterFieldDef[];
  /** Default 20. */
  defaultSize?: number;
  defaultSort?: readonly Sort[];
  /**
   * Pagination mode when the URL carries no page/cursor.
   * Use `{ kind: "offset", offset: 0 }` for offset pagers; otherwise the
   * binding would have to guess between cursor and offset.
   */
  defaultPage?: PageState;
  /** Flat URL-key prefix for multiple collections on one route. */
  namespace?: string;
}

export type FlatSearchParams = Record<string, unknown>;
export type FlatPatch = Record<string, string | number | readonly string[] | undefined>;

/** Minimal Standard Schema v1 shape (TanStack validateSearch accepts it directly). */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  "~standard": {
    version: 1;
    vendor: string;
    validate(value: Input): { value: Output };
  };
}

export interface CollectionSearchSchema extends StandardSchemaV1<unknown, FlatSearchParams> {
  /** Physical URL keys owned by this schema (used by combineSearch collision checks). */
  readonly keys: readonly string[];
}

export interface SearchSerializer {
  parseSearch(query: string): FlatSearchParams;
  stringifySearch(params: FlatSearchParams): string;
}

export interface CollectionSearch<S extends CollectionState = CollectionState> {
  readonly spec: CollectionSearchSpec;
  readonly defaults: S;
  readonly schema: CollectionSearchSchema;
  readonly serializer: SearchSerializer;
  encode(state: S): FlatPatch;
  decode(params: Record<string, unknown>): S;
  toRequest(state: S): CollectionRequest;
  patch(part: Partial<S>): FlatPatch;
  reset(): FlatPatch;
  parseSearch(query: string): FlatSearchParams;
  stringifySearch(params: FlatSearchParams): string;
}

const OPERATORS: ReadonlySet<string> = new Set([
  "eq",
  "ne",
  "contains",
  "in",
  "gt",
  "lt",
  "gte",
  "lte",
  "exists",
]);

const OWNED_NAMES = ["q", "filter", "sort", "cursor", "page", "size"] as const;

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value !== "") return [value];
  return [];
}

function positiveInt(value: unknown): number | undefined {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function parseFilter(entry: string): FilterValue | null {
  const first = entry.indexOf(":");
  const second = entry.indexOf(":", first + 1);
  if (first <= 0 || second < 0) return null;
  const field = entry.slice(0, first);
  const op = entry.slice(first + 1, second);
  if (!OPERATORS.has(op)) return null;
  const raw = entry.slice(second + 1);
  const value = op === "in" ? raw.split(",").filter(Boolean) : raw;
  return { field, op: op as Operator, value };
}

function encodeFilter(filter: FilterValue): string {
  const value = Array.isArray(filter.value) ? filter.value.join(",") : String(filter.value);
  return `${filter.field}:${filter.op}:${value}`;
}

function parseSort(entry: string): Sort | null {
  const index = entry.lastIndexOf(":");
  if (index <= 0) return null;
  const dir = entry.slice(index + 1);
  if (dir !== "asc" && dir !== "desc") return null;
  return { field: entry.slice(0, index), dir };
}

export function collectionSearch<S extends CollectionState = CollectionState>(
  spec: CollectionSearchSpec = {},
): CollectionSearch<S> {
  if (spec.namespace?.includes(".")) {
    throw new Error(
      `@lynxland/uikit-core: namespace "${spec.namespace}" must not contain "." (URL key ownership is prefix-based)`,
    );
  }

  const defaultSize = positiveInt(spec.defaultSize) ?? 20;
  const prefix = spec.namespace !== undefined ? `${spec.namespace}.` : "";
  const key = (name: string): string => `${prefix}${name}`;
  const ownedKeys = OWNED_NAMES.map(key);
  const ownedKeySet = new Set(ownedKeys);

  const read = (params: Record<string, unknown>, name: string): unknown => params[key(name)];

  const decodeSort = (params: Record<string, unknown>): Sort[] =>
    toArray(read(params, "sort"))
      .map(parseSort)
      .filter((sort): sort is Sort => sort !== null);

  const decodeFilters = (params: Record<string, unknown>): FilterValue[] =>
    toArray(read(params, "filter"))
      .map(parseFilter)
      .filter((filter): filter is FilterValue => filter !== null);

  const decodeSize = (params: Record<string, unknown>): number => {
    const parsed = positiveInt(read(params, "size"));
    return parsed ?? defaultSize;
  };

  const defaults = {
    size: defaultSize,
    ...(spec.defaultSort !== undefined ? { sort: spec.defaultSort } : {}),
    ...(spec.defaultPage !== undefined ? { page: spec.defaultPage } : {}),
  } as S;

  const encode = (state: S): FlatPatch => {
    const out: FlatPatch = {};
    if (state.q !== undefined && state.q.trim() !== "") out[key("q")] = state.q;
    if (state.filters !== undefined && state.filters.length > 0) {
      out[key("filter")] = state.filters.map(encodeFilter);
    }
    if (state.sort !== undefined && state.sort.length > 0) {
      out[key("sort")] = state.sort.map((sort) => `${sort.field}:${sort.dir}`);
    }

    const size = state.size ?? defaultSize;
    if (size !== defaultSize) out[key("size")] = size;

    const page = state.page;
    if (page?.kind === "cursor" && page.cursor !== undefined) {
      out[key("cursor")] = page.cursor;
    } else if (page?.kind === "offset" && page.offset > 0) {
      out[key("page")] = Math.floor(page.offset / size) + 1;
    } else if (page?.kind === "all") {
      out[key("page")] = "all";
    }
    return out;
  };

  const decode = (params: Record<string, unknown>): S => {
    const out: CollectionState = {};
    const q = read(params, "q");
    if (typeof q === "string" && q.trim() !== "") out.q = q;

    const filters = decodeFilters(params);
    if (filters.length > 0) out.filters = filters;

    const sort = decodeSort(params);
    if (sort.length > 0) out.sort = sort;

    const size = decodeSize(params);
    if (size !== defaultSize) out.size = size;

    const cursor = read(params, "cursor");
    const page = read(params, "page");
    if (typeof cursor === "string" && cursor !== "") {
      out.page = { kind: "cursor", cursor };
    } else if (page === "all") {
      out.page = { kind: "all" };
    } else {
      const pageNumber = positiveInt(page);
      if (pageNumber !== undefined && pageNumber > 1) {
        out.page = { kind: "offset", offset: (pageNumber - 1) * size };
      }
    }
    return out as S;
  };

  const toRequest = (state: S): CollectionRequest => {
    const predicates: Predicate[] = [];
    const text = typeof state.q === "string" ? textPredicate(spec.text ?? [], state.q) : undefined;
    if (text !== undefined) predicates.push(text);
    for (const filter of state.filters ?? []) {
      predicates.push({ field: filter.field, op: filter.op, value: filter.value });
    }

    const where: Predicate | undefined =
      predicates.length === 0
        ? undefined
        : predicates.length === 1
          ? predicates[0]
          : { all: predicates };

    const order = state.sort !== undefined ? state.sort : spec.defaultSort;
    const size = state.size ?? defaultSize;
    const page = state.page ?? spec.defaultPage;

    let window: CollectionWindow;
    if (page?.kind === "offset") {
      window = { kind: "offset", size, offset: page.offset };
    } else if (page?.kind === "all") {
      window = { kind: "all", ...(state.size !== undefined ? { size: state.size } : {}) };
    } else if (page?.kind === "cursor" && page.cursor !== undefined) {
      window = { kind: "cursor", size, cursor: page.cursor };
    } else {
      window = { kind: "cursor", size };
    }

    return {
      ...(where !== undefined ? { where } : {}),
      ...(order !== undefined && order.length > 0 ? { order } : {}),
      window,
    };
  };

  const patch = (part: Partial<S>): FlatPatch => {
    const out: FlatPatch = {};
    const clearPaging = (): void => {
      out[key("cursor")] = undefined;
      out[key("page")] = undefined;
    };

    if ("q" in part) {
      out[key("q")] = part.q !== undefined && part.q !== "" ? part.q : undefined;
      clearPaging();
    }
    if ("filters" in part) {
      out[key("filter")] =
        part.filters !== undefined && part.filters.length > 0
          ? part.filters.map(encodeFilter)
          : undefined;
      clearPaging();
    }
    if ("sort" in part) {
      out[key("sort")] =
        part.sort !== undefined && part.sort.length > 0
          ? part.sort.map((sort) => `${sort.field}:${sort.dir}`)
          : undefined;
      clearPaging();
    }
    if ("page" in part) {
      const page = part.page;
      out[key("cursor")] = page?.kind === "cursor" ? page.cursor : undefined;
      if (page?.kind === "all") {
        out[key("page")] = "all";
      } else if (page?.kind === "offset" && page.offset > 0) {
        out[key("page")] = Math.floor(page.offset / (part.size ?? defaultSize)) + 1;
      } else {
        out[key("page")] = undefined;
      }
    }
    if ("size" in part && part.size !== undefined) {
      out[key("size")] = part.size;
    }
    return out;
  };

  const reset = (): FlatPatch => {
    const out: FlatPatch = {};
    for (const owned of ownedKeys) out[owned] = undefined;
    return out;
  };

  const normalize = (input: unknown): FlatSearchParams => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const out: FlatSearchParams = {};

    const q = raw[key("q")];
    if (typeof q === "string" && q.trim() !== "") out[key("q")] = q;

    const filters = toArray(raw[key("filter")])
      .map(parseFilter)
      .filter((filter): filter is FilterValue => filter !== null)
      .map(encodeFilter);
    if (filters.length > 0) out[key("filter")] = filters;

    const sort = toArray(raw[key("sort")])
      .map(parseSort)
      .filter((entry): entry is Sort => entry !== null)
      .map((entry) => `${entry.field}:${entry.dir}`);
    if (sort.length > 0) out[key("sort")] = sort;

    const cursor = raw[key("cursor")];
    if (typeof cursor === "string" && cursor !== "") out[key("cursor")] = cursor;

    const page = raw[key("page")];
    if (page === "all") {
      out[key("page")] = "all";
    } else {
      const pageNumber = positiveInt(page);
      if (pageNumber !== undefined && pageNumber > 1) out[key("page")] = pageNumber;
    }

    const size = positiveInt(raw[key("size")]);
    if (size !== undefined && size !== defaultSize) out[key("size")] = size;

    for (const [param, value] of Object.entries(raw)) {
      if (value === undefined || ownedKeySet.has(param)) continue;
      if (param in out) continue;
      out[param] = value;
    }
    return out;
  };

  const schema: CollectionSearchSchema = {
    "~standard": {
      version: 1,
      vendor: "@lynxland/uikit-core",
      validate(value: unknown) {
        return { value: normalize(value) };
      },
    },
    keys: ownedKeys,
  };

  return {
    spec: { ...spec, defaultSize },
    defaults,
    schema,
    serializer: { parseSearch, stringifySearch },
    encode,
    decode,
    toRequest,
    patch,
    reset,
    parseSearch,
    stringifySearch,
  };
}

/** Repeated-key URLSearchParams parsing; single values stay scalars. */
export function parseSearch(query: string): FlatSearchParams {
  const out: FlatSearchParams = {};
  const search = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  search.forEach((value, param) => {
    const existing = out[param];
    if (existing === undefined) {
      out[param] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      out[param] = [existing, value];
    }
  });
  return out;
}

/** Repeated-key serialization with a leading `?`; empty result is "". */
export function stringifySearch(params: FlatSearchParams): string {
  const search = new URLSearchParams();
  for (const [param, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(param, String(item));
    } else if (typeof value === "object" && value !== null && !(value instanceof Date)) {
      search.append(param, JSON.stringify(value));
    } else {
      search.append(param, String(value));
    }
  }
  const query = search.toString();
  return query === "" ? "" : `?${query}`;
}
