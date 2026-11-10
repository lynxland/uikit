import { useCallback, useState } from "react";

/**
 * Small preference utility: localStorage-backed state with a codec.
 * Corrupt/legacy values fall back instead of throwing.
 */

export interface PreferenceCodec<T> {
  parse(raw: string): T;
  stringify(value: T): string;
}

const jsonCodec: PreferenceCodec<unknown> = {
  parse: (raw) => JSON.parse(raw) as unknown,
  stringify: (value) => JSON.stringify(value),
};

/** Pure read; absent/unparsable input returns `fallback`. */
export function decodePreference<T>(
  raw: string | null | undefined,
  fallback: T,
  codec?: PreferenceCodec<T>,
): T {
  if (raw === null || raw === undefined) return fallback;
  try {
    return codec !== undefined ? codec.parse(raw) : (jsonCodec.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function encodePreference<T>(value: T, codec?: PreferenceCodec<T>): string {
  return codec !== undefined ? codec.stringify(value) : jsonCodec.stringify(value);
}

export function usePreference<T>(
  key: string,
  fallback: T,
  codec?: PreferenceCodec<T>,
): readonly [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() =>
    typeof window === "undefined"
      ? fallback
      : decodePreference(window.localStorage.getItem(key), fallback, codec),
  );

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (current: T) => T)(prev) : next;
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(key, encodePreference(resolved, codec));
          } catch {
            // Private mode / quota: preference persistence is best-effort.
          }
        }
        return resolved;
      });
    },
    [key, codec],
  );

  return [value, set] as const;
}
