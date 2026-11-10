import type { ButtonProps } from "@lynxland/uikit-surfaces/adapter";
import { cva, type VariantProps } from "class-variance-authority";
import { cloneElement, forwardRef, isValidElement, type ReactElement } from "react";
import { cx } from "./cx";
import { Loader } from "./icons";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] shadow-sm hover:bg-[var(--secondary)]/80",
        outline:
          "border border-[var(--input)] bg-[var(--background)] text-[var(--foreground)] shadow-sm hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-sm hover:bg-[var(--destructive)]/90",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        md: "h-9 px-4 py-2",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

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
      throw new Error(
        "@lynxland/uikit-ui-shadcn Button: asChild expects a single React element child.",
      );
    }
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cx(buttonVariants({ variant, size }), child.props.className),
      ...(loading ? { "aria-busy": true, "data-loading": true } : {}),
    } as Partial<{ className?: string }>);
  }

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cx(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      {loading ? <Loader className="animate-spin" size={16} /> : null}
      {children}
    </button>
  );
});

export { buttonVariants };
