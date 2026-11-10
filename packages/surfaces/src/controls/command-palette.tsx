import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";
import { CommandFooter, CommandList, CommandSearch } from "./command-parts";
import { type CommandGroup, type CommandItem, useCommandList } from "./use-command-list";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Flat items; use `group`/`groups` to render section headings. */
  items?: readonly CommandItem[];
  groups?: readonly CommandGroup[];
  title?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  emptyText?: ReactNode;
  /** Replace the default Kbd hint row while keeping the result count. */
  footer?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

/**
 * Modal command palette (navigation/search). The adapter Dialog owns the
 * portal, focus trap and Escape handling; the shared command-list hook owns
 * filtering and arrow/Home/End/Enter navigation. No Router import: selection
 * is the caller's `onSelect` callback.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  groups,
  title = "Search",
  description = "Jump to a page or action.",
  placeholder = "Search pages and actions…",
  emptyText = "No results.",
  footer,
  className,
  "aria-label": ariaLabel,
}: CommandPaletteProps) {
  const ui = useUiAdapter();
  return (
    <ui.Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="md"
    >
      {open ? (
        <CommandPalettePanel
          items={items}
          groups={groups}
          placeholder={placeholder}
          emptyText={emptyText}
          footer={footer}
          className={className}
          ariaLabel={ariaLabel ?? "Search commands"}
          onEscape={() => onOpenChange(false)}
          onSelect={(item) => {
            onOpenChange(false);
            item.onSelect?.();
          }}
        />
      ) : null}
    </ui.Dialog>
  );
}

interface CommandPalettePanelProps {
  items?: readonly CommandItem[];
  groups?: readonly CommandGroup[];
  placeholder: string;
  emptyText: ReactNode;
  footer?: ReactNode;
  className?: string;
  ariaLabel: string;
  onEscape: () => void;
  onSelect: (item: CommandItem) => void;
}

function CommandPalettePanel({
  items,
  groups,
  placeholder,
  emptyText,
  footer,
  className,
  ariaLabel,
  onEscape,
  onSelect,
}: CommandPalettePanelProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const list = useCommandList({ items, groups, onSelect, onEscape });

  return (
    <div
      className={merge("ui-command ui-command--palette", className)}
      data-testid="command-palette"
    >
      <CommandSearch
        list={list}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        inputTestId="command-input"
      />
      <CommandList list={list} ariaLabel={ariaLabel} emptyText={emptyText} />
      <CommandFooter count={list.filtered.length}>{footer}</CommandFooter>
    </div>
  );
}
