import type { MenuProps } from "@lynxland/uikit-surfaces/adapter";
import { Fragment, useState } from "react";
import { cx } from "./cx";
import { Popover } from "./popover";

/**
 * Minimal action menu built on the plain Popover. It is a reference for the
 * contract; ui-shadcn uses Base UI Menu for full keyboard/menu semantics.
 */
export function Menu({
  trigger,
  items,
  align = "start",
  side = "bottom",
  "aria-label": ariaLabel,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} trigger={trigger} align={align} side={side}>
      <div role="menu" aria-label={ariaLabel} className="ui-plain-menu">
        {items.map((item, index) => (
          <Fragment key={typeof item.label === "string" ? item.label : index}>
            {item.separator === true ? <hr className="ui-plain-menu__separator" /> : null}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cx("ui-plain-menu__item", item.danger === true && "ui-plain-menu__item--danger")}
              onClick={() => {
                setOpen(false);
                item.onSelect?.();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          </Fragment>
        ))}
      </div>
    </Popover>
  );
}
