import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names, letting later Tailwind utilities win over
 * earlier ones. Exposed on the adapter as `cx` so surfaces can join its own
 * structural classes with adapter classes without assuming Tailwind.
 */
export function cx(...values: ClassValue[]): string {
  return twMerge(clsx(values));
}
