import type {
  CollectionRequest,
  CollectionWindow,
  FieldValue,
  Operator,
  Predicate,
  Sort,
} from "./contracts.js";

export type FilterValue = {
  field: string;
  op: Operator;
  value: FieldValue;
};

export type PageState =
  | { kind: "cursor"; cursor?: string }
  | { kind: "offset"; offset: number }
  | { kind: "all" };

export interface CollectionState {
  q?: string;
  filters?: readonly FilterValue[];
  sort?: readonly Sort[];
  page?: PageState;
  size?: number;
}

export interface FilterFieldDef {
  field: string;
  op?: Operator;
  options?: ReadonlyArray<{ value: string; label: string }>;
}

export interface CollectionSearchSpec {
  text?: readonly string[];
  filters?: readonly FilterFieldDef[];
  defaultSize?: number;
  defaultSort?: readonly Sort[];
  /** URL key namespace for multiple collections on one route. */
  namespace?: string;
}

export type FlatParams = Record<string, string | string[] | number | undefined>;

export interface CollectionSearch {
  readonly spec: CollectionSearchSpec;
  readonly defaults: CollectionState;
  encode(state: CollectionState): FlatParams;
  decode(params: Record<string, unknown>): CollectionState;
  toRequest(state: CollectionState): CollectionRequest;
  patch(part: Partial<CollectionState>): FlatParams;
  reset(): FlatParams;
  parseSearch(query: string): Record<string, unknown>;
  stringifySearch(params: Record<string, unknown>): string;
}

export function collectionSearch(spec: CollectionSearchSpec = {}): CollectionSearch {
  const size = spec.defaultSize ?? 20;
  const prefix = spec.namespace ? `${spec.namespace}.` : "";
  const key = (name: string): string => `${prefix}${name}`;
  const defaults: CollectionState = {
    size,
    ...(spec.defaultSort ? { sort: spec.defaultSort } : {}),
  };

  const read = (params: Record<string, unknown>, name: string): unknown =>
    params[key(name)];

  const readArray = (params: Record<string, unknown>, name: string): string[] => {
    const value = read(params, name);
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
    if (typeof value === "string" && value !== "") return [value];
    return [];
  };

  const parseFilter = (entry: string): FilterValue | null => {
    const i1 = entry.indexOf(":");
    const i2 = entry.indexOf(":", i1 + 1);
    if (i1 < 0 || i2 < 0) return null;
    const field = entry.slice(0, i1);
    const op = entry.slice(i1 + 1, i2) as Operator;
    const raw = entry.slice(i2 + 1);
    const value = op === "in" ? raw.split(",").filter(Boolean) : raw;
    return { field, op, value };
  };

  const encodeFilter = (filter: FilterValue): string => {
    const value = Array.isArray(filter.value)
      ? filter.value.join(",")
      : String(filter.value);
    return `${filter.field}:${filter.op}:${value}`;
  };

  const pageOf = (state: CollectionState): PageState | undefined => state.page;

  const encode = (state: CollectionState): FlatParams => {
    const out: FlatParams = {};
    if (state.q !== undefined && state.q !== "") out[key("q")] = state.q;
    if (state.filters && state.filters.length > 0) {
      out[key("filter")] = state.filters.map(encodeFilter);
    }
    if (state.sort && state.sort.length > 0) {
      out[key("sort")] = state.sort.map((o) => `${o.field}:${o.dir}`);
    }
    const s = state.size ?? size;
    if (s !== size) out[key("size")] = s;
    const page = pageOf(state);
    if (page?.kind === "cursor" && page.cursor !== undefined) {
      out[key("cursor")] = page.cursor;
    } else if (page?.kind === "offset" && page.offset > 0) {
      out[key("page")] = Math.floor(page.offset / s) + 1;
    }
    return out;
  };

  const decode = (params: Record<string, unknown>): CollectionState => {
    const out: CollectionState = {};
    const q = read(params, "q");
    if (typeof q === "string" && q.trim() !== "") out.q = q;
    const filters = readArray(params, "filter")
      .map(parseFilter)
      .filter((f): f is FilterValue => f !== null);
    if (filters.length > 0) out.filters = filters;
    const sort = readArray(params, "sort")
      .map((entry) => {
        const i = entry.lastIndexOf(":");
        const dir = entry.slice(i + 1);
        return i > 0 && (dir === "asc" || dir === "desc")
          ? ({ field: entry.slice(0, i), dir } as Sort)
          : null;
      })
      .filter((o): o is Sort => o !== null);
    if (sort.length > 0) out.sort = sort;
    const sizeValue = read(params, "size");
    const parsedSize =
      typeof sizeValue === "number"
        ? sizeValue
        : typeof sizeValue === "string"
          ? Number.parseInt(sizeValue, 10)
          : size;
    const safeSize = Number.isFinite(parsedSize) && parsedSize > 0 ? Math.floor(parsedSize) : size;
    if (safeSize !== size) out.size = safeSize;
    const cursor = read(params, "cursor");
    if (typeof cursor === "string" && cursor !== "") {
      out.page = { kind: "cursor", cursor };
    } else {
      const pageValue = read(params, "page");
      const pageNumber =
        typeof pageValue === "number"
          ? pageValue
          : typeof pageValue === "string"
            ? Number.parseInt(pageValue, 10)
            : undefined;
      if (pageNumber !== undefined && Number.isFinite(pageNumber) && pageNumber > 1) {
        out.page = { kind: "offset", offset: (pageNumber - 1) * safeSize };
      }
    }
    return out;
  };

  const toRequest = (state: CollectionState): CollectionRequest => {
    const predicates: Predicate[] = [];
    if (state.q && state.q.trim() !== "" && spec.text && spec.text.length > 0) {
      predicates.push({
        any: spec.text.map((field) => ({ field, op: "contains", value: state.q!.trim() })),
      });
    }
    for (const filter of state.filters ?? []) {
      predicates.push({ field: filter.field, op: filter.op, value: filter.value });
    }
    const where: Predicate | undefined =
      predicates.length === 0
        ? undefined
        : predicates.length === 1
          ? predicates[0]
          : { all: predicates };
    const sizeValue = state.size ?? size;
    const page = state.page;
    const window: CollectionWindow =
      page?.kind === "cursor"
        ? { kind: "cursor", size: sizeValue, ...(page.cursor ? { cursor: page.cursor } : {}) }
        : page?.kind === "offset"
          ? { kind: "offset", size: sizeValue, offset: page.offset }
          : { kind: "cursor", size: sizeValue };
    return {
      ...(where ? { where } : {}),
      ...(state.sort ?? spec.defaultSort ? { order: state.sort ?? spec.defaultSort } : {}),
      window,
    };
  };

  const patch = (part: Partial<CollectionState>): FlatParams => {
    const out: FlatParams = {};
    if ("q" in part) out[key("q")] = part.q || undefined;
    if ("filters" in part) {
      out[key("filter")] =
        part.filters && part.filters.length > 0
          ? part.filters.map(encodeFilter)
          : undefined;
      out[key("cursor")] = undefined;
      out[key("page")] = undefined;
    }
    if ("sort" in part) {
      out[key("sort")] =
        part.sort && part.sort.length > 0
          ? part.sort.map((o) => `${o.field}:${o.dir}`)
          : undefined;
      out[key("cursor")] = undefined;
      out[key("page")] = undefined;
    }
    if ("page" in part) {
      const page = part.page;
      out[key("cursor")] = page?.kind === "cursor" ? page.cursor : undefined;
      out[key("page")] =
        page?.kind === "offset" && page.offset > 0
          ? Math.floor(page.offset / (part.size ?? size)) + 1
          : undefined;
    }
    if ("size" in part && part.size !== undefined) out[key("size")] = part.size;
    return out;
  };

  const reset = (): FlatParams => ({
    [key("q")]: undefined,
    [key("filter")]: undefined,
    [key("sort")]: undefined,
    [key("cursor")]: undefined,
    [key("page")]: undefined,
  });

  return {
    spec: { ...spec, defaultSize: size },
    defaults,
    encode,
    decode,
    toRequest,
    patch,
    reset,
    parseSearch,
    stringifySearch,
  };
}

/** Repeated-key URLSearchParams parsing; arrays become arrays, single values stay scalars. */
export function parseSearch(query: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const params = new URLSearchParams(query);
  for (const [key, value] of params) {
    const existing = out[key];
    if (existing === undefined) {
      out[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      out[key] = [existing, value];
    }
  }
  return out;
}

/** Repeated-key serialization; arrays become repeated keys. Unknown objects JSON-encoded. */
export function stringifySearch(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else if (
      typeof value === "object" &&
      value !== null &&
      !(value instanceof Date)
    ) {
      search.append(key, JSON.stringify(value));
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
