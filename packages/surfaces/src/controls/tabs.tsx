import { type TabsItem, useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

export interface TabsControlProps {
  items: readonly TabsItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: "underline" | "pills" | "filter" | "segmented";
  "aria-label"?: string;
  className?: string;
}

/**
 * Thin controlled wrapper over the adapter Tabs. Keyboard navigation, focus
 * and ARIA live in the adapter; this control only maps `onChange` and owns the
 * structural wrapper class.
 */
export function Tabs({
  items,
  value,
  onChange,
  variant,
  "aria-label": ariaLabel,
  className,
}: TabsControlProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  return (
    <div className={merge("ui-tabs", className)} data-variant={variant ?? "underline"}>
      <ui.Tabs
        items={items}
        value={value}
        onValueChange={onChange}
        {...(variant !== undefined ? { variant } : {})}
        {...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {})}
      />
    </div>
  );
}
