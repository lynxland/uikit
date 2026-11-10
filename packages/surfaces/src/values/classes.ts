/** Zero-dependency class name merge used when the UI adapter has no `cx`. */
export type ClassValue = string | false | null | undefined;

export function cx(...values: ClassValue[]): string {
  return values
    .filter((value): value is string => typeof value === "string" && value !== "")
    .join(" ");
}
