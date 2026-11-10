import {
  type CommandItem,
  CommandPalette,
  Kbd,
  useHotkey,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { type NavDestination, navDestinations } from "@/lib/nav";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const value = useContext(CommandPaletteContext);
  if (value === null) {
    throw new Error("useCommandPalette must be used inside <CommandPaletteProvider>");
  }
  return value;
}

/** Small header affordance for the palette; ⌘K / Ctrl K still works globally. */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const ui = useUiAdapter();
  const { setOpen } = useCommandPalette();
  return (
    <ui.Tooltip
      content={
        <span className="inline-flex items-center gap-1.5">
          Search <Kbd shortcut="mod+k" />
        </span>
      }
      trigger={
        <ui.Button
          type="button"
          variant="ghost"
          size="icon"
          className={className}
          aria-label="Open command palette"
          data-testid="command-trigger"
          onClick={() => setOpen(true)}
        >
          <Search size={15} aria-hidden="true" />
        </ui.Button>
      }
    />
  );
}

function destinationItems(navigate: (destination: NavDestination) => void): readonly CommandItem[] {
  return navDestinations.map((destination) => ({
    id: destination.to,
    label: destination.label,
    group: destination.section,
    icon: destination.icon,
    keywords: [destination.to],
    onSelect: () => navigate(destination),
  }));
}

/**
 * App-level command palette. The surfaces `CommandPalette` owns filtering,
 * keyboard navigation and the dialog; this provider only owns the open state,
 * the app's destination list, and the Router navigation callback.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useHotkey({
    key: "k",
    mod: true,
    ignoreEditable: false,
    handler: () => setOpen((current) => !current),
  });

  const items = useMemo(
    () =>
      destinationItems((destination) => {
        void navigate({ to: destination.to as never });
      }),
    [navigate],
  );

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={items}
        title="Search"
        description="Jump to a page or setting."
        placeholder="Search pages and settings…"
        emptyText="No destinations match your search."
      />
    </CommandPaletteContext.Provider>
  );
}
