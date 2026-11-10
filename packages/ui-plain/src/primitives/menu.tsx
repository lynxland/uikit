// biome-ignore-all lint/suspicious/noArrayIndexKey: menu declarations are static; item order is the identity.
import type { MenuItem, MenuProps } from "@lynxland/uikit-surfaces/adapter";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cx } from "./cx";
import { Check, ChevronRight } from "./icons";
import { Popover } from "./popover";

const ITEM_SELECTOR = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';

function itemElements(menu: HTMLElement): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
    (element) => element.closest('[role="menu"]') === menu && !element.hasAttribute("disabled"),
  );
}

function focusRelative(menu: HTMLElement, delta: 1 | -1): void {
  const items = itemElements(menu);
  if (items.length === 0) return;
  const current =
    document.activeElement instanceof HTMLElement ? items.indexOf(document.activeElement) : -1;
  const next =
    current === -1
      ? delta === 1
        ? 0
        : items.length - 1
      : (current + delta + items.length) % items.length;
  items[next]?.focus();
}

function handleMenuKeyDown(
  event: ReactKeyboardEvent<HTMLDivElement>,
  onExitSubmenu: (() => void) | undefined,
): void {
  const menu = event.currentTarget;
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      focusRelative(menu, 1);
      break;
    case "ArrowUp":
      event.preventDefault();
      focusRelative(menu, -1);
      break;
    case "Home": {
      event.preventDefault();
      itemElements(menu)[0]?.focus();
      break;
    }
    case "End": {
      event.preventDefault();
      const items = itemElements(menu);
      items[items.length - 1]?.focus();
      break;
    }
    case "ArrowRight":
      if (active?.getAttribute("aria-haspopup") === "menu") {
        event.preventDefault();
        active.click();
      }
      break;
    case "ArrowLeft":
    case "Escape":
      if (onExitSubmenu !== undefined) {
        // Only the innermost submenu closes; the root menu keeps its own
        // Escape handling in the Popover.
        event.preventDefault();
        event.stopPropagation();
        onExitSubmenu();
      }
      break;
    default:
      break;
  }
}

function itemContent(item: MenuItem): ReactNode {
  return (
    <>
      {item.icon !== undefined ? <span className="ui-plain-menu__icon">{item.icon}</span> : null}
      <span className="ui-plain-menu__label">{item.label}</span>
    </>
  );
}

function itemClass(item: MenuItem): string {
  return cx("ui-plain-menu__item", item.danger === true && "ui-plain-menu__item--danger");
}

interface PlainMenuListProps {
  items: readonly MenuItem[];
  ariaLabel?: string;
  autoFocus?: boolean;
  nested?: boolean;
  onCloseRoot: () => void;
  onExitSubmenu?: () => void;
}

function PlainMenuList({
  items,
  ariaLabel,
  autoFocus = false,
  nested = false,
  onCloseRoot,
  onExitSubmenu,
}: PlainMenuListProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const menu = menuRef.current;
    if (menu !== null) itemElements(menu)[0]?.focus();
  }, [autoFocus]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={ariaLabel}
      className={cx("ui-plain-menu", nested && "ui-plain-menu--nested")}
      onKeyDown={(event) => handleMenuKeyDown(event, onExitSubmenu)}
      data-slot="menu"
    >
      {items.map((item, index) => {
        const kind = item.kind ?? "item";
        const prefix =
          item.separator === true || kind === "separator" ? (
            <hr key={`separator-${index}`} className="ui-plain-menu__separator" />
          ) : null;

        if (kind === "separator") {
          return prefix;
        }

        if (kind === "label") {
          return [
            prefix,
            <div key={`label-${index}`} role="presentation" className="ui-plain-menu__label-item">
              {item.label}
            </div>,
          ];
        }

        if (kind === "checkbox") {
          return [
            prefix,
            <button
              key={index}
              type="button"
              role="menuitemcheckbox"
              aria-checked={item.checked === true}
              disabled={item.disabled}
              className={cx(itemClass(item), "ui-plain-menu__item--checkable")}
              onClick={() => {
                item.onCheckedChange?.(item.checked !== true);
                item.onSelect?.();
              }}
            >
              {itemContent(item)}
              {item.checked === true ? (
                <Check className="ui-plain-menu__indicator" size={14} />
              ) : null}
            </button>,
          ];
        }

        if (kind === "radio") {
          return [
            prefix,
            <button
              key={index}
              type="button"
              role="menuitemradio"
              aria-checked={item.checked === true}
              disabled={item.disabled}
              className={cx(itemClass(item), "ui-plain-menu__item--checkable")}
              onClick={() => {
                item.onCheckedChange?.(true);
                item.onSelect?.();
                onCloseRoot();
              }}
            >
              {itemContent(item)}
              {item.checked === true ? (
                <Check className="ui-plain-menu__indicator" size={14} />
              ) : null}
            </button>,
          ];
        }

        if (kind === "submenu") {
          return [prefix, <PlainSubmenu key={index} item={item} onCloseRoot={onCloseRoot} />];
        }

        return [
          prefix,
          <button
            key={index}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={itemClass(item)}
            onClick={() => {
              onCloseRoot();
              item.onSelect?.();
            }}
          >
            {itemContent(item)}
          </button>,
        ];
      })}
    </div>
  );
}

function PlainSubmenu({ item, onCloseRoot }: { item: MenuItem; onCloseRoot: () => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="ui-plain-menu__submenu" data-open={open || undefined}>
      <button
        ref={triggerRef}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={item.disabled}
        className={itemClass(item)}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        {itemContent(item)}
        <ChevronRight className="ui-plain-menu__submenu-icon" size={14} />
      </button>
      {open ? (
        <PlainMenuList
          items={item.items ?? []}
          nested
          autoFocus
          onCloseRoot={onCloseRoot}
          onExitSubmenu={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Minimal action menu built on the plain Popover. It is a reference for the
 * contract: roles (`menu`, `menuitemcheckbox`, `menuitemradio`, nested `menu`),
 * checked state, submenus and Arrow/Home/End/Escape handling are implemented
 * here because no headless library is available.
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
      <PlainMenuList
        items={items}
        ariaLabel={ariaLabel}
        autoFocus
        onCloseRoot={() => setOpen(false)}
      />
    </Popover>
  );
}
