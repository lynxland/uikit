import type { InputProps, TextareaProps } from "@lynxland/uikit-surfaces/adapter";
import { forwardRef } from "react";
import { cx } from "./cx";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cx("ui-plain-input", className)}
      data-slot="input"
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cx("ui-plain-textarea", className)}
      data-slot="textarea"
      {...props}
    />
  );
});
