import type { SelectOption } from "../adapter";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

/**
 * Controlled scope selector (design.md §6.3). The page owns the value and its
 * persistence/URL sync; this component reads no global scope.
 */

export type ScopeSwitcherItem = SelectOption;

export interface ScopeSwitcherProps {
  items: readonly ScopeSwitcherItem[];
  value?: string;
  onChange: (value: string) => void;
  /** Accessible name, e.g. "Project"/"Cluster" (entity words stay in the page). */
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ScopeSwitcher({
  items,
  value,
  onChange,
  label = "Scope",
  placeholder,
  disabled,
  className,
}: ScopeSwitcherProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;

  return (
    <div className={merge("ui-scope-switcher", className)} data-testid="scope-switcher">
      <ui.Select
        value={value ?? ""}
        options={items}
        onValueChange={onChange}
        aria-label={label}
        {...(placeholder !== undefined ? { placeholder } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
      />
    </div>
  );
}
