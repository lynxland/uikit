import { useUiAdapter } from "@lynxland/uikit-surfaces";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

/** Small header affordance for the palette; ⌘K still works globally. */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const ui = useUiAdapter();
  const { setOpen } = useCommandPalette();
  return (
    <ui.Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Open command palette"
      title="Search (⌘K)"
      data-testid="command-trigger"
      onClick={() => setOpen(true)}
    >
      <Search size={15} aria-hidden="true" />
    </ui.Button>
  );
}

/**
 * App-level command palette. ⌘K / Ctrl+K toggles it; the list filters the
 * navigation destinations (including placeholder routes) and navigates with
 * TanStack Router. The heavy lifting stays in the adapter Dialog/Input.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  );
}

function matches(destination: NavDestination, query: string): boolean {
  if (query.trim() === "") return true;
  const haystack = `${destination.section} ${destination.label} ${destination.to}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function CommandPalette() {
  const ui = useUiAdapter();
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const filtered = useMemo(
    () => navDestinations.filter((destination) => matches(destination, query)),
    [query],
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex((current) => (current >= filtered.length ? 0 : current));
  }, [filtered.length]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const select = useCallback(
    (destination: NavDestination) => {
      setOpen(false);
      void navigate({ to: destination.to as never });
    },
    [navigate, setOpen],
  );

  return (
    <ui.Dialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Jump to a page or setting."
      size="md"
    >
      <div className="space-y-3" data-testid="command-palette">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <ui.Input
            autoFocus
            aria-label="Search destinations"
            placeholder="Search pages and settings…"
            className="pl-9"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) =>
                  filtered.length === 0 ? 0 : (current + 1) % filtered.length,
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) =>
                  filtered.length === 0 ? 0 : (current - 1 + filtered.length) % filtered.length,
                );
              } else if (event.key === "Enter") {
                const destination = filtered[activeIndex];
                if (destination !== undefined) {
                  event.preventDefault();
                  select(destination);
                }
              }
            }}
            data-testid="command-input"
          />
        </div>

        <ul className="max-h-80 space-y-0.5 overflow-y-auto" aria-label="Destinations">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No destinations match “{query}”.
            </li>
          ) : (
            filtered.map((destination, index) => {
              const active = index === activeIndex;
              return (
                <li key={destination.to}>
                  <button
                    ref={active ? activeRef : undefined}
                    type="button"
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(destination)}
                    data-testid={`command-item-${destination.to}`}
                  >
                    <span className="text-muted-foreground">{destination.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{destination.label}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {destination.section}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-[11px] text-muted-foreground">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span>{filtered.length} destinations</span>
        </div>
      </div>
    </ui.Dialog>
  );
}
