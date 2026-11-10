import type { TabsItem, TabsProps } from "@lynxland/uikit-surfaces/adapter";
import { type KeyboardEvent, useRef } from "react";
import { cx } from "./cx";

function firstEnabled(items: readonly TabsItem[], from: number, step: 1 | -1): number {
  for (let offset = 1; offset <= items.length; offset += 1) {
    const index = (from + step * offset + items.length * items.length) % items.length;
    if (items[index]?.disabled !== true) {
      return index;
    }
  }
  return -1;
}

function lastEnabled(items: readonly TabsItem[]): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index]?.disabled !== true) {
      return index;
    }
  }
  return -1;
}

/**
 * Controlled tab *bar* only. Panels are composed by surfaces/views; the
 * adapter owns roving tabIndex and arrow/Home/End navigation so the keyboard
 * behaviour is implemented exactly once.
 *
 * No `aria-controls` is emitted because the adapter does not know which panel
 * element (if any) the caller renders. Callers should give the matching panel
 * `role="tabpanel"` and an `aria-labelledby` if they need the full pattern.
 */
export function Tabs({
  items,
  value,
  onValueChange,
  variant = "underline",
  "aria-label": ariaLabel,
}: TabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveTo = (index: number) => {
    const item = items[index];
    if (item === undefined) {
      return;
    }
    if (item.value !== value) {
      onValueChange(item.value);
    }
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = firstEnabled(items, index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = firstEnabled(items, index, -1);
        break;
      case "Home":
        next = items.findIndex((item) => item.disabled !== true);
        break;
      case "End":
        next = lastEnabled(items);
        break;
      default:
        return;
    }
    if (next < 0) {
      return;
    }
    event.preventDefault();
    moveTo(next);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx("ui-plain-tabs", `ui-plain-tabs--${variant}`)}
      data-variant={variant}
      data-full-width={variant === "segmented" ? "true" : undefined}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            data-state={selected ? "active" : "inactive"}
            data-disabled={item.disabled || undefined}
            className={cx(
              "ui-plain-tab",
              `ui-plain-tab--${variant}`,
              selected && "ui-plain-tab--active",
            )}
            onClick={() => {
              if (item.disabled !== true) {
                onValueChange(item.value);
              }
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
