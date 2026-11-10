import type { ReactElement, ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";
import { CommandFooter, CommandList, CommandSearch } from "./command-parts";
import { type CommandGroup, type CommandItem, useCommandList } from "./use-command-list";

export interface CommandMenuProps {
  /** Rendered as the popover trigger (never nested inside another button). */
  trigger: ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items?: readonly CommandItem[];
  groups?: readonly CommandGroup[];
  placeholder?: string;
  emptyText?: ReactNode;
  /** Optional footer; the default shows Kbd hints and the result count. */
  footer?: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  /**
   * Class for the popover surface (e.g. a width utility). When provided it
   * replaces the default `ui-command-menu__popover` width/padding class, so
   * callers that override it should include their own padding.
   */
  contentClassName?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Searchable popover command menu (environment/provider pickers). Uses the
 * adapter Popover for positioning/focus and the shared command-list hook for
 * filtering, checked state and Arrow/Home/End/Enter/Escape navigation.
 *
 * The panel is mounted only while open, so each opening starts with a fresh
 * query and an active item (the checked one when present).
 */
export function CommandMenu({
  trigger,
  open,
  onOpenChange,
  items,
  groups,
  placeholder = "Search…",
  emptyText = "No results.",
  footer,
  side = "bottom",
  align = "start",
  contentClassName,
  className,
  "aria-label": ariaLabel,
}: CommandMenuProps) {
  const ui = useUiAdapter();
  const flatItems = items ?? groups?.flatMap((group) => group.items) ?? [];
  const initialActiveIndex = flatItems.findIndex(
    (item) => item.checked === true && item.disabled !== true,
  );

  return (
    <ui.Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      side={side}
      align={align}
      className={contentClassName ?? "ui-command-menu__popover"}
    >
      {open ? (
        <CommandMenuPanel
          items={items}
          groups={groups}
          placeholder={placeholder}
          emptyText={emptyText}
          footer={footer}
          className={className}
          ariaLabel={ariaLabel ?? "Commands"}
          initialActiveIndex={initialActiveIndex}
          onEscape={() => onOpenChange(false)}
          onSelect={(item) => {
            onOpenChange(false);
            item.onSelect?.();
          }}
        />
      ) : null}
    </ui.Popover>
  );
}

interface CommandMenuPanelProps {
  items?: readonly CommandItem[];
  groups?: readonly CommandGroup[];
  placeholder: string;
  emptyText: ReactNode;
  footer?: ReactNode;
  className?: string;
  ariaLabel: string;
  initialActiveIndex: number;
  onEscape: () => void;
  onSelect: (item: CommandItem) => void;
}

function CommandMenuPanel({
  items,
  groups,
  placeholder,
  emptyText,
  footer,
  className,
  ariaLabel,
  initialActiveIndex,
  onEscape,
  onSelect,
}: CommandMenuPanelProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const list = useCommandList({
    items,
    groups,
    initialActiveIndex: initialActiveIndex >= 0 ? initialActiveIndex : undefined,
    onSelect,
    onEscape,
  });

  return (
    <div className={merge("ui-command ui-command--menu", className)} data-testid="command-menu">
      <CommandSearch
        list={list}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        inputTestId="command-menu-input"
      />
      <CommandList list={list} ariaLabel={ariaLabel} emptyText={emptyText} />
      <CommandFooter count={list.filtered.length}>{footer}</CommandFooter>
    </div>
  );
}
