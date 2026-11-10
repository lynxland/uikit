import { Select as BaseSelect } from "@base-ui/react/select";
import type { SelectProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";
import { Check, ChevronDown } from "./icons";
import { fieldControl } from "./input";

const triggerClass = cx(
  fieldControl,
  "h-9 cursor-pointer items-center justify-between gap-2 py-2 text-left [&>span]:truncate",
);

const popupClass =
  "z-50 max-h-[min(24rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--popover)] p-1 text-[var(--popover-foreground)] shadow-md data-[starting-style]:opacity-0 data-[ending-style]:opacity-0";

const itemClass =
  "relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[highlighted]:bg-[var(--accent)] data-[highlighted]:text-[var(--accent-foreground)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

/**
 * Controlled select over Base UI. The compound Root/Trigger/Portal/Popup API
 * stops here; callers only see value/options/onValueChange.
 */
export function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  disabled = false,
  id,
  "aria-label": ariaLabel,
}: SelectProps) {
  return (
    <BaseSelect.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        if (typeof next === "string") onValueChange?.(next);
      }}
      items={options}
      disabled={disabled}
      id={id}
    >
      <BaseSelect.Trigger aria-label={ariaLabel} className={triggerClass}>
        <BaseSelect.Value placeholder={placeholder} />
        <BaseSelect.Icon className="flex size-4 shrink-0 items-center justify-center text-[var(--muted-foreground)]">
          <ChevronDown />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4}>
          <BaseSelect.Popup className={popupClass}>
            <BaseSelect.List>
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  disabled={option.disabled}
                  className={itemClass}
                >
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <Check />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
