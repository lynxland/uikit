import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { MenuProps } from "@lynxland/uikit-surfaces/adapter";
import { Fragment } from "react";
import { cx } from "./cx";

/**
 * Controlled-by-Base-UI action menu. The trigger is rendered as the trigger
 * element via `render`, so a Button/Link does not get nested inside a button.
 */
export function Menu({
  trigger,
  items,
  align = "start",
  side = "bottom",
  "aria-label": ariaLabel,
}: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner side={side} align={align} sideOffset={4}>
          <BaseMenu.Popup
            aria-label={ariaLabel}
            className={cx(
              "z-50 min-w-44 rounded-md border border-[var(--border)] bg-[var(--popover)] p-1 text-[var(--popover-foreground)] shadow-md outline-none",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            )}
          >
            {items.map((item, index) => (
              <Fragment key={typeof item.label === "string" ? item.label : index}>
                {item.separator === true ? (
                  <BaseMenu.Separator className="my-1 h-px bg-[var(--border)]" />
                ) : null}
                <BaseMenu.Item
                  disabled={item.disabled}
                  onClick={item.onSelect}
                  className={cx(
                    "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                    "data-[highlighted]:bg-[var(--accent)] data-[highlighted]:text-[var(--accent-foreground)]",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    item.danger === true && "text-[var(--destructive)]",
                  )}
                >
                  {item.icon !== undefined ? (
                    <span className="inline-flex size-4 shrink-0 items-center justify-center">
                      {item.icon}
                    </span>
                  ) : null}
                  {item.label}
                </BaseMenu.Item>
              </Fragment>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
