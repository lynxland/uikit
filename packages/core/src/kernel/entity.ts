import type { AnyCommand } from "./command";
import type {
  CollectionReader,
  CollectionSource,
  LookupReader,
  LookupSource,
  RecordReader,
  RecordSource,
  SourceName,
} from "./source";
import { collectionSource, lookupSource, recordSource, sourceName } from "./source";
import type { StreamSource } from "./stream";

/**
 * Entity is an optional grouping of capabilities. It is not a fourth
 * primitive, not a route registration, and it carries no hidden protocol.
 */
export interface EntitySpec<T, ID = string> {
  readonly name: SourceName;
  readonly key?: (row: T) => ID;
  readonly scope?: readonly string[];
  readonly collection?: CollectionReader<T>;
  readonly record?: RecordReader<T, ID>;
  readonly lookup?: LookupReader<T, ID>;
  readonly commands?: Record<string, AnyCommand>;
  readonly streams?: Record<string, StreamSource<any>>;
}

export interface Entity<T, ID = string> {
  readonly name: SourceName;
  readonly key?: (row: T) => ID;
  readonly scope?: readonly string[];
  readonly collection?: CollectionSource<T>;
  readonly record?: RecordSource<T, ID>;
  readonly lookup?: LookupSource<T, ID>;
  readonly commands?: Record<string, AnyCommand>;
  readonly streams?: Record<string, StreamSource<any>>;
}

/**
 * Attach the entity name/scope to internal capabilities. Query keys only ever
 * read the public `name`/`scope` on the capability itself.
 */
export function defineEntity<T, ID = string>(spec: EntitySpec<T, ID>): Entity<T, ID> {
  const name = sourceName(spec.name);
  const scope = spec.scope;

  const collection = spec.collection
    ? collectionSource({ ...spec.collection, name, ...(scope !== undefined ? { scope } : {}) })
    : undefined;
  const record = spec.record
    ? recordSource({ ...spec.record, name, ...(scope !== undefined ? { scope } : {}) })
    : undefined;
  const lookup = spec.lookup
    ? lookupSource({
        ...spec.lookup,
        name,
        ...(scope !== undefined ? { scope } : {}),
        ...(spec.key !== undefined ? { key: spec.key } : {}),
      })
    : undefined;

  return {
    name,
    ...(spec.key !== undefined ? { key: spec.key } : {}),
    ...(scope !== undefined ? { scope } : {}),
    ...(collection !== undefined ? { collection } : {}),
    ...(record !== undefined ? { record } : {}),
    ...(lookup !== undefined ? { lookup } : {}),
    ...(spec.commands !== undefined ? { commands: spec.commands } : {}),
    ...(spec.streams !== undefined ? { streams: spec.streams } : {}),
  };
}
