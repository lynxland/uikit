import type { InputProps, TextareaProps } from "@lynxland/uikit-surfaces/adapter";
import { forwardRef } from "react";
import { cx } from "./cx";

const fieldControl =
  "flex w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-1 text-sm text-[var(--foreground)] shadow-sm transition-colors placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-[var(--destructive)] aria-[invalid=true]:ring-[var(--destructive)]";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", ...props },
  ref,
) {
  return <input ref={ref} type={type} className={cx(fieldControl, "h-9", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cx(fieldControl, "min-h-20 py-2", className)} {...props} />;
});

export { fieldControl };
