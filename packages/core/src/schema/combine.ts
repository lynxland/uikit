/**
 * Compose multiple search validators into one validateSearch function.
 *
 * Duplicate-key detection is ownership-aware: a schema may optionally expose
 * `keys` (our collectionSearch schema does). Unknown/passthrough keys are not
 * treated as owned, so composing namespaced search schemas keeps working.
 */

export interface AnyStandardSchema {
  "~standard": {
    version: number;
    vendor?: string;
    validate(input: unknown): { value: unknown };
  };
  /** Optional physical-key ownership metadata for collision detection. */
  keys?: readonly string[];
}

export type SearchPart = AnyStandardSchema | ((input: unknown) => unknown);

interface Ownership {
  owned: boolean;
  index: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function combineSearch(
  ...parts: readonly SearchPart[]
): (input: unknown) => Record<string, unknown> {
  return (input: unknown): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    const owners = new Map<string, Ownership>();

    parts.forEach((part, index) => {
      const value =
        typeof part === "function" ? part(input) : part["~standard"].validate(input).value;
      if (!isRecord(value)) {
        throw new Error("@lynxland/uikit-core: combineSearch part must return an object");
      }

      const declared = typeof part === "function" ? undefined : part.keys;
      const owned = declared !== undefined ? new Set(declared) : new Set(Object.keys(value));

      for (const [key, entry] of Object.entries(value)) {
        const isOwned = owned.has(key);
        const previous = owners.get(key);
        if (previous !== undefined) {
          if (previous.owned && isOwned) {
            throw new Error(
              `@lynxland/uikit-core: combineSearch duplicate key "${key}" (parts ${previous.index} and ${index})`,
            );
          }
          // A passthrough value must not overwrite an owned value.
          if (previous.owned && !isOwned) continue;
        }
        out[key] = entry;
        owners.set(key, { owned: previous?.owned === true || isOwned, index });
      }
    });

    return out;
  };
}
