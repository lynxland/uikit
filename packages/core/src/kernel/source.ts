import type { CollectionPage, CollectionRequest, Scope } from "./types";

/**
 * Branded source name. The brand is optional at the type level so string
 * literals are accepted by the factories, but the factory validates the
 * kebab-case shape at runtime.
 */
declare const sourceNameBrand: unique symbol;
export type SourceName = string & { readonly [sourceNameBrand]?: true };

const SOURCE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export function sourceName(value: string): SourceName {
  if (!SOURCE_NAME_PATTERN.test(value)) {
    throw new Error(
      `@lynxland/uikit-core: source name "${value}" must be kebab-case (it lives in query keys and diagnostics)`,
    );
  }
  return value as SourceName;
}

export interface CollectionSource<T> {
  readonly name: SourceName;
  /** Declared scope keys used for query-key partitioning and readiness checks. */
  readonly scope?: readonly string[];
  read(request: CollectionRequest, ctx: Scope, signal?: AbortSignal): Promise<CollectionPage<T>>;
}

export interface RecordSource<T, ID = string> {
  readonly name: SourceName;
  readonly scope?: readonly string[];
  /** null = record does not exist (empty state). Adapters may throw not-found instead. */
  read(id: ID, ctx: Scope, signal?: AbortSignal): Promise<T | null>;
}

/** Foreign-key resolution. The old BatchSource/useBatch name is gone. */
export interface LookupSource<T, ID = string> {
  readonly name: SourceName;
  readonly scope?: readonly string[];
  /** Row -> id projection for `byId`/`missingIds`; bindings fall back to `row.id`. */
  readonly key?: (row: T) => ID;
  read(ids: readonly ID[], ctx: Scope, signal?: AbortSignal): Promise<readonly T[]>;
}

/** The part of a source an entity attaches name/scope to. */
export type CollectionReader<T> = Omit<CollectionSource<T>, "name" | "scope">;
export type RecordReader<T, ID = string> = Omit<RecordSource<T, ID>, "name" | "scope">;
export type LookupReader<T, ID = string> = Omit<LookupSource<T, ID>, "name" | "scope">;

function withName<T extends object>(
  name: string,
  scope: readonly string[] | undefined,
  rest: T,
): T {
  const validated = sourceName(name);
  return {
    ...rest,
    name: validated,
    ...(scope !== undefined ? { scope } : {}),
  } as T;
}

export function collectionSource<T>(spec: CollectionSource<T>): CollectionSource<T> {
  const { name, scope, ...rest } = spec;
  return withName(name, scope, rest) as CollectionSource<T>;
}

export function recordSource<T, ID = string>(spec: RecordSource<T, ID>): RecordSource<T, ID> {
  const { name, scope, ...rest } = spec;
  return withName(name, scope, rest) as RecordSource<T, ID>;
}

export function lookupSource<T, ID = string>(spec: LookupSource<T, ID>): LookupSource<T, ID> {
  const { name, scope, ...rest } = spec;
  return withName(name, scope, rest) as LookupSource<T, ID>;
}
