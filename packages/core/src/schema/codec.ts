import {
  type CollectionQuery,
  type Operator,
  type Order,
  type Predicate,
  type QueryWindow,
  textPredicate,
} from "../kernel";

/**
 * /schema —— CollectionQuery 的 URL 编解码（Effect Schema 单源的公开面）。
 *
 * 对外只暴露纯函数 + Standard Schema 包装：消费方可自选 schema 库，
 * 与自有 search 参数在纯对象层合并（validateSearch 接受纯函数）。
 * URL 键名定案：q / filter=field:op:value（重复键）/ sort=field:dir / cursor / page / size。
 */

export interface FilterFieldDef {
  field: string;
  /** 缺省 "eq" */
  op?: Operator;
  label?: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
}

export interface QuerySchemaSpec {
  /** q 参与文本搜索的字段白名单 */
  text?: ReadonlyArray<string>;
  filters?: ReadonlyArray<FilterFieldDef>;
  /** 默认 20 */
  defaultSize?: number;
  defaultOrder?: ReadonlyArray<Order>;
  /**
   * URL 键命名空间（M1）：缺省 off（存量 URL 零变化）；多集合同路由显式开启后，
   * 本 schema 的全部 URL 键带扁平前缀（`tasks.q` / `tasks.page`）——各持各键、
   * 互不携带；TanStack 序列化为普通字符串键（非嵌套对象）。禁止含 "."（键归属
   * 以前缀判定）。
   */
  namespace?: string;
}

/** URL 中的扁平参数形状（human-readable）。未知键（消费方自定义参数）缺省透传。 */
export interface FlatSearchParams {
  q?: string;
  filter?: ReadonlyArray<string>;
  sort?: ReadonlyArray<string>;
  cursor?: string;
  page?: number;
  size?: number;
  /** 消费方自定义参数（tab 等）——编解码无损（M3 passthrough），类型面宽容 */
  [key: string]: unknown;
}

/** toSearchSchema 的未知键处置：passthrough（缺省）= 编解码无损（tab/自定义参数
 *  存活）；drop = 严格丢弃（旧行为，需显式选择）。 */
export type UnknownKeysMode = "passthrough" | "drop";

export interface ToSearchSchemaOptions {
  unknownKeys?: UnknownKeysMode;
}

export type FlatPatch = Partial<
  Record<string, string | number | ReadonlyArray<string> | undefined>
>;

/** Standard Schema v1 的最小结构形状（TanStack Router validateSearch 直收）。 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  "~standard": {
    version: 1;
    vendor: "@lynxland/uikit-core";
    validate(value: Input): { value: Output };
  };
}

const OPERATORS = new Set<string>([
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

export interface QuerySearchSchema {
  toSearchSchema(options?: ToSearchSchemaOptions): StandardSchemaV1<unknown, FlatSearchParams>;
  encode(query: CollectionQuery): FlatSearchParams;
  decode(params: unknown): CollectionQuery;
  patch(part: {
    predicate?: Predicate | null;
    order?: ReadonlyArray<Order> | null;
    window?: QueryWindow;
  }): FlatPatch;
  /** 全清补丁（绑定 reset 用）：本 schema 全部键显式 undefined（函数式展开清值）。 */
  resetPatch(): FlatPatch;
  readonly defaults: CollectionQuery;
  readonly spec: QuerySchemaSpec;
}

export function collectionQuerySchema(spec: QuerySchemaSpec = {}): QuerySearchSchema {
  const defaultSize = spec.defaultSize ?? 20;
  if (spec.namespace !== undefined && spec.namespace.includes(".")) {
    throw new Error(
      `@lynxland/uikit-core: namespace "${spec.namespace}" must not contain "." (URL key ownership is prefix-based)`,
    );
  }
  // M1 namespace：URL 键的扁平前缀（缺省空 = 存量无前缀形态）。
  // encode/patch/toSearchSchema/resetPatch 读写**物理键**（带前缀）；
  // encodePredicate 保持逻辑形状（q/filter），由调用侧落物理键。
  const prefix = spec.namespace ? `${spec.namespace}.` : "";
  const key = (name: string): string => `${prefix}${name}`;
  const defaults: CollectionQuery = {
    window: { size: defaultSize },
    ...(spec.defaultOrder ? { order: spec.defaultOrder } : {}),
  };

  // ---- 谓词 <-> 扁平键 ----

  function encodePredicate(predicate: Predicate | undefined): {
    q?: string;
    filter?: ReadonlyArray<string>;
  } {
    if (predicate === undefined) return {};
    const textSet = new Set(spec.text ?? []);
    const filters: string[] = [];
    let q: string | undefined;
    for (const leaf of flattenLeaves(predicate)) {
      if (
        leaf.op === "contains" &&
        textSet.has(leaf.field as string) &&
        typeof leaf.value === "string"
      ) {
        q = q === undefined ? leaf.value : q; // 同值多字段（textPredicate 的 any 形）
        continue;
      }
      const value = Array.isArray(leaf.value) ? leaf.value.join(",") : String(leaf.value);
      filters.push(`${leaf.field}:${leaf.op}:${value}`);
    }
    return { ...(q !== undefined ? { q } : {}), ...(filters.length ? { filter: filters } : {}) };
  }

  function flattenLeaves(p: Predicate): ReadonlyArray<Extract<Predicate, { field: string }>> {
    if ("field" in p) return [p];
    if ("all" in p) return p.all.flatMap(flattenLeaves);
    // any 只允许 textPredicate 产生的纯文本形；一般 OR 树不进 URL（消费方自定义参数）
    const leaves = p.any.flatMap(flattenLeaves);
    const textSet = new Set(spec.text ?? []);
    const isText = leaves.every(
      (l) => l.op === "contains" && textSet.has(l.field as string) && typeof l.value === "string",
    );
    if (!isText) {
      throw new Error(
        "@lynxland/uikit-core: predicate with OR is not URL-serializable — keep it in local state or a custom search param",
      );
    }
    return leaves;
  }

  function parseFilterEntry(entry: string): Extract<Predicate, { field: string }> | null {
    const i1 = entry.indexOf(":");
    const i2 = entry.indexOf(":", i1 + 1);
    if (i1 < 0 || i2 < 0) return null;
    const field = entry.slice(0, i1);
    const op = entry.slice(i1 + 1, i2);
    if (!OPERATORS.has(op)) return null;
    const rawValue = entry.slice(i2 + 1);
    const value = op === "in" ? rawValue.split(",").filter(Boolean) : rawValue;
    return { field, op: op as Operator, value };
  }

  function decodePredicate(params: FlatSearchParams): Predicate | undefined {
    const parts: Predicate[] = [];
    const q = params[key("q")];
    if (typeof q === "string") {
      const text = textPredicate(spec.text ?? [], q);
      if (text) parts.push(text);
    }
    for (const entry of (params[key("filter")] as ReadonlyArray<string> | undefined) ?? []) {
      const leaf = parseFilterEntry(entry);
      if (leaf) parts.push(leaf);
    }
    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return { all: parts };
  }

  // ---- 窗口 <-> 键 ----

  function decodeWindow(params: FlatSearchParams): QueryWindow {
    const size = positiveInt(params[key("size")]) ?? defaultSize;
    const cursor = params[key("cursor")];
    if (typeof cursor === "string" && cursor !== "") {
      return { size, cursor };
    }
    const page = positiveInt(params[key("page")]);
    if (page !== undefined && page > 1) {
      return { size, range: { offset: (page - 1) * size } };
    }
    return { size };
  }

  // ---- 归一化（validateSearch 用；容忍脏输入，绝不 throw） ----
  // M3：缺省 passthrough——未知键原样保留（tab/消费方自定义参数不再被静默删除）；
  // 归一化处理过的自有键（含无效条目、默认值等价形态）不透传回填。严格丢弃为显式选项。
  // M1：自有键 = 带命名空间前缀的物理键；其他命名空间/无前缀的键对本 schema 是未知键（透传）。

  const ownedKeys = new Set(["q", "filter", "sort", "cursor", "page", "size"].map(key));

  function normalize(input: unknown, unknownKeys: UnknownKeysMode = "passthrough"): FlatSearchParams {
    const raw = (input ?? {}) as Record<string, unknown>;
    const out: FlatSearchParams = {};
    const q = raw[key("q")];
    if (typeof q === "string" && q.trim() !== "") out[key("q")] = q;
    const filter = toArray(raw[key("filter")]).filter((e) => parseFilterEntry(e) !== null);
    if (filter.length > 0) out[key("filter")] = filter;
    const sort = toArray(raw[key("sort")]).filter((e) => {
      const i = e.indexOf(":");
      if (i < 0) return false;
      return e.slice(i + 1) === "asc" || e.slice(i + 1) === "desc";
    });
    if (sort.length > 0) out[key("sort")] = sort;
    const cursor = raw[key("cursor")];
    if (typeof cursor === "string" && cursor !== "") out[key("cursor")] = cursor;
    const page = positiveInt(raw[key("page")]);
    if (page !== undefined && page > 1) out[key("page")] = page;
    const size = positiveInt(raw[key("size")]);
    if (size !== undefined && size !== defaultSize) out[key("size")] = size;
    if (unknownKeys === "passthrough") {
      for (const [k, value] of Object.entries(raw)) {
        if (value === undefined) continue;
        if (k in out) continue;
        if (ownedKeys.has(k)) continue; // 自有键以归一化结果为准（无效条目不回填）
        out[k] = value;
      }
    }
    return out;
  }

  function decodeOrders(params: FlatSearchParams): ReadonlyArray<Order> | undefined {
    const orders = ((params[key("sort")] as ReadonlyArray<string> | undefined) ?? [])
      .map((e) => {
        const i = e.indexOf(":");
        const field = e.slice(0, i);
        const dir = e.slice(i + 1);
        return dir === "asc" || dir === "desc" ? ({ field, dir } as Order) : null;
      })
      .filter((o): o is Order => o !== null);
    return orders.length > 0 ? orders : undefined;
  }

  return {
    spec,
    defaults,
    toSearchSchema(options: ToSearchSchemaOptions = {}) {
      const mode = options.unknownKeys ?? "passthrough";
      return {
        "~standard": {
          version: 1,
          vendor: "@lynxland/uikit-core",
          validate(value: unknown) {
            return { value: normalize(value, mode) };
          },
        },
      };
    },
    encode(query: CollectionQuery): FlatSearchParams {
      // 物理键（带命名空间前缀）——encode 即 URL 面
      const flat: FlatSearchParams = {};
      const encoded = encodePredicate(query.predicate);
      if (encoded.q !== undefined) flat[key("q")] = encoded.q;
      if (encoded.filter !== undefined) flat[key("filter")] = encoded.filter;
      if (query.order?.length) flat[key("sort")] = query.order.map((o) => `${o.field}:${o.dir}`);
      const w = query.window;
      flat[key("size")] = w.size;
      if (w.cursor !== undefined) flat[key("cursor")] = w.cursor;
      else if (w.range && w.range.offset > 0)
        flat[key("page")] = Math.floor(w.range.offset / w.size) + 1;
      return flat;
    },
    decode(params: unknown): CollectionQuery {
      const flat = normalize(params);
      // "URL + schema 默认值即真相"：URL 无 sort 时落 defaultOrder（不落会静默丢默认排序）
      const order = decodeOrders(flat) ?? spec.defaultOrder;
      return {
        ...(decodePredicate(flat) !== undefined ? { predicate: decodePredicate(flat) } : {}),
        ...(order ? { order } : {}),
        window: decodeWindow(flat),
      };
    },
    patch(part): FlatPatch {
      const out: FlatPatch = {};
      if ("predicate" in part) {
        // 清除时必须显式 q/filter = undefined：函数式 search 是 {...prev, ...patch}
        // 展开，缺席的键会让旧值存活（Clear 后 URL 残留 q——fleetly 试点实咬）。
        const flat = encodePredicate(part.predicate ?? undefined);
        out[key("q")] = flat.q;
        out[key("filter")] = flat.filter;
        out[key("cursor")] = undefined; // 换谓词回第一页
        out[key("page")] = undefined;
      }
      if ("order" in part) {
        const order = part.order ?? [];
        if (order.length > 0) out[key("sort")] = order.map((o) => `${o.field}:${o.dir}`);
        else out[key("sort")] = undefined;
        out[key("cursor")] = undefined; // 换向回第一页（keyset 游标与方向耦合）
        out[key("page")] = undefined;
      }
      if (part.window) {
        const w = part.window;
        if ("size" in w) out[key("size")] = w.size;
        if (w.cursor !== undefined) {
          out[key("cursor")] = w.cursor;
          out[key("page")] = undefined;
        } else if (w.range) {
          out[key("page")] = Math.floor(w.range.offset / w.size) + 1;
          out[key("cursor")] = undefined;
        }
      }
      return out;
    },
    resetPatch(): FlatPatch {
      // 全部自有键显式 undefined（函数式 search 展开清值——缺席则旧值存活）
      return {
        [key("q")]: undefined,
        [key("filter")]: undefined,
        [key("sort")]: undefined,
        [key("cursor")]: undefined,
        [key("page")]: undefined,
      };
    },
  };
}

// ---- 工具 ----

function toArray(value: unknown): ReadonlyArray<string> {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value !== "") return [value];
  return [];
}

function positiveInt(value: unknown): number | undefined {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}
