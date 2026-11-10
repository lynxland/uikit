import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { TabsProps } from "@lynxland/uikit-surfaces/adapter";
import { cva, type VariantProps } from "class-variance-authority";
import { cx } from "./cx";

const listVariants = cva("flex items-center", {
  variants: {
    variant: {
      underline: "h-9 justify-start gap-1 border-b border-[var(--border)] bg-transparent p-0",
      pills: "inline-flex gap-1 rounded-lg bg-[var(--muted)] p-1",
      filter: "flex-wrap gap-1.5",
      segmented:
        "w-full justify-start gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-1",
    },
  },
  defaultVariants: {
    variant: "underline",
  },
});

const tabVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        underline:
          "relative h-9 gap-1.5 rounded-none px-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] data-[active]:text-[var(--foreground)] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent data-[active]:after:bg-[var(--primary)]",
        pills:
          "h-7 gap-1.5 rounded-md px-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] data-[active]:bg-[var(--background)] data-[active]:text-[var(--foreground)] data-[active]:shadow-sm",
        filter:
          "h-8 gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--muted-foreground)] hover:border-[var(--ring)] hover:text-[var(--foreground)] data-[active]:border-[var(--primary)] data-[active]:bg-[var(--primary)] data-[active]:text-[var(--primary-foreground)]",
        segmented:
          "h-7 flex-none gap-1.5 rounded-md border border-transparent px-3.5 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] data-[active]:border-[var(--border)] data-[active]:bg-[var(--background)] data-[active]:text-[var(--foreground)] data-[active]:shadow-sm",
      },
    },
    defaultVariants: {
      variant: "underline",
    },
  },
);

export type TabsVariantProps = VariantProps<typeof tabVariants>;

/**
 * Controlled tab bar. Base UI owns roving focus, arrow keys and ARIA wiring;
 * panels are composed by surfaces/views around this bar, not by the adapter.
 */
export function Tabs({
  items,
  value,
  onValueChange,
  variant = "underline",
  "aria-label": ariaLabel,
}: TabsProps) {
  return (
    <BaseTabs.Root
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onValueChange(next);
      }}
    >
      <BaseTabs.List aria-label={ariaLabel} className={listVariants({ variant })}>
        {items.map((item) => (
          <BaseTabs.Tab
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cx(tabVariants({ variant }))}
          >
            {item.label}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
    </BaseTabs.Root>
  );
}

export { listVariants, tabVariants };
