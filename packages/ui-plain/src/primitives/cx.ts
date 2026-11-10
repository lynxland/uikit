/**
 * Tiny class-name join. `ui-plain` intentionally avoids clsx/tailwind-merge:
 * classes are plain CSS identifiers and later values simply win by source
 * order in a stylesheet, not by utility conflict resolution.
 */
export type ClassValue = string | false | null | undefined;

export function cx(...values: ClassValue[]): string {
  return values
    .filter((value): value is string => typeof value === "string" && value !== "")
    .join(" ");
}
