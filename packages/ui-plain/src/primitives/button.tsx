import type { ButtonProps } from "@lynxland/uikit-surfaces/adapter";
import { cloneElement, forwardRef, isValidElement, type ReactElement } from "react";
import { cx } from "./cx";
import { Loader } from "./icons";

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "ui-plain-button--default",
  secondary: "ui-plain-button--secondary",
  outline: "ui-plain-button--outline",
  ghost: "ui-plain-button--ghost",
  destructive: "ui-plain-button--destructive",
};

const sizeClass: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "ui-plain-button--sm",
  md: "ui-plain-button--md",
  lg: "ui-plain-button--lg",
  icon: "ui-plain-button--icon",
};

/**
 * Plain HTML button. Visual variants map to `ui-plain-button--*` classes;
 * loading disables the button and announces `aria-busy`.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "default",
    size = "md",
    loading = false,
    disabled,
    children,
    type,
    asChild = false,
    ...props
  },
  ref,
) {
  if (asChild) {
    if (!isValidElement(children)) {
      throw new Error("@lynxland/uikit-ui-plain Button: asChild expects a single React element child.");
    }
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cx(
        "ui-plain-button",
        variantClass[variant],
        sizeClass[size],
        child.props.className,
      ),
      ...(loading ? { "aria-busy": true, "data-loading": true } : {}),
    } as Partial<{ className?: string }>);
  }

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cx(
        "ui-plain-button",
        variantClass[variant],
        sizeClass[size],
        loading && "ui-plain-button--loading",
        className,
      )}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {loading ? <Loader className="ui-plain-spin" size={16} /> : null}
      {children}
    </button>
  );
});
