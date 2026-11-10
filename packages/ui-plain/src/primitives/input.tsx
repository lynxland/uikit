import type { InputProps, TextareaProps } from "@lynxland/uikit-surfaces/adapter";
import { forwardRef } from "react";
import { cx } from "./cx";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", variant = "default", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cx("ui-plain-input", variant === "bare" && "ui-plain-input--bare", className)}
      data-slot="input"
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
        "ui-plain-textarea",
        variant === "bare" && "ui-plain-textarea--bare",
        className,
      )}
      data-slot="textarea"
      data-variant={variant}
      {...props}
    />
  );
});
