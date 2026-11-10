import type { InputProps, TextareaProps } from "@lynxland/uikit-surfaces/adapter";
import { forwardRef } from "react";
import { cx } from "./cx";

const fieldControl =
  "flex w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-1 text-sm text-[var(--foreground)] shadow-sm transition-colors placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-[var(--destructive)] aria-[invalid=true]:ring-[var(--destructive)]";

/**
 * Grouped controls drop their own frame; the surrounding `InputGroup` owns
 * border, focus ring, invalid and disabled state. No padding either, so the
 * group can provide uniform inline spacing.
 */
const fieldControlBare =
  "w-full border-0 bg-transparent p-0 text-sm text-[var(--foreground)] shadow-none outline-none placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", variant = "default", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cx(
        variant === "bare" ? fieldControlBare : fieldControl,
        variant === "default" && "h-9",
        variant === "bare" && "h-full min-h-0",
        className,
      )}
      data-variant={variant}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cx(
        variant === "bare" ? fieldControlBare : fieldControl,
        variant === "default" && "min-h-20 py-2",
        variant === "bare" && "min-h-0 resize-none",
        className,
      )}
      data-variant={variant}
      {...props}
    />
  );
});

export { fieldControl };
