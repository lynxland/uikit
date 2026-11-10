import type { BadgeProps } from "@lynxland/uikit-surfaces/adapter";
import { cva, type VariantProps } from "class-variance-authority";
import { cx } from "./cx";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      tone: {
        neutral: "",
        success: "",
        warning: "",
        danger: "",
        info: "",
      },
      variant: {
        solid: "border-transparent",
        soft: "",
        outline: "bg-transparent",
      },
    },
    compoundVariants: [
      {
        tone: "neutral",
        variant: "solid",
        class: "bg-[var(--muted)] text-[var(--foreground)]",
      },
      {
        tone: "neutral",
        variant: "soft",
        class: "border-transparent bg-[var(--muted)] text-[var(--muted-foreground)]",
      },
      {
        tone: "neutral",
        variant: "outline",
        class: "border-[var(--border)] text-[var(--muted-foreground)]",
      },
      {
        tone: "success",
        variant: "solid",
        class: "bg-[var(--status-success)] text-white",
      },
      {
        tone: "success",
        variant: "soft",
        class: "border-transparent bg-[var(--status-success)]/15 text-[var(--status-success)]",
      },
      {
        tone: "success",
        variant: "outline",
        class: "border-[var(--status-success)]/40 text-[var(--status-success)]",
      },
      {
        tone: "warning",
        variant: "solid",
        class: "bg-[var(--status-warning)] text-white",
      },
      {
        tone: "warning",
        variant: "soft",
        class: "border-transparent bg-[var(--status-warning)]/15 text-[var(--status-warning)]",
      },
      {
        tone: "warning",
        variant: "outline",
        class: "border-[var(--status-warning)]/40 text-[var(--status-warning)]",
      },
      {
        tone: "danger",
        variant: "solid",
        class: "bg-[var(--status-danger)] text-white",
      },
      {
        tone: "danger",
        variant: "soft",
        class: "border-transparent bg-[var(--status-danger)]/15 text-[var(--status-danger)]",
      },
      {
        tone: "danger",
        variant: "outline",
        class: "border-[var(--status-danger)]/40 text-[var(--status-danger)]",
      },
      {
        tone: "info",
        variant: "solid",
        class: "bg-[var(--status-info)] text-white",
      },
      {
        tone: "info",
        variant: "soft",
        class: "border-transparent bg-[var(--status-info)]/15 text-[var(--status-info)]",
      },
      {
        tone: "info",
        variant: "outline",
        class: "border-[var(--status-info)]/40 text-[var(--status-info)]",
      },
    ],
    defaultVariants: {
      tone: "neutral",
      variant: "soft",
    },
  },
);

export type BadgeVariantProps = VariantProps<typeof badgeVariants>;

export function Badge({ children, tone = "neutral", variant = "soft" }: BadgeProps) {
  return (
    <span className={cx(badgeVariants({ tone, variant }))} data-tone={tone} data-variant={variant}>
      {children}
    </span>
  );
}

export { badgeVariants };
