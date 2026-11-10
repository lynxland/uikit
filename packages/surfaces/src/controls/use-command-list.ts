import {
  type ChangeEvent,
  type MouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * One headless list-navigation model shared by `CommandPalette` and
 * `CommandMenu` (design.md §6.2). It owns query filtering, the active option,
 * Arrow/Home/End/Enter/Escape handling and scroll-into-view. It deliberately
 * knows nothing about Popover/Dialog or Router.
 */

export interface CommandItem {
  /** Stable identity used for keys and the default `command-item-<id>` test id. */
  id?: string;
  label: string;
  /** Optional grouping label; consecutive items with the same group render together. */
  group?: string;
  icon?: ReactNode;
  /** Extra search terms that are not displayed. */
  keywords?: readonly string[];
  checked?: boolean;
  disabled?: boolean;
  /** Trailing shortcut hint, typically a `<Kbd>`. */
  shortcut?: ReactNode;
  onSelect?: () => void;
  /** Explicit test id; defaults to `command-item-<id>` when `id` is set. */
  testId?: string;
}

export interface CommandGroup {
  label?: string;
  items: readonly CommandItem[];
}

export interface CommandListOptions {
  items?: readonly CommandItem[];
  groups?: readonly CommandGroup[];
  /** Initial active option, e.g. the currently checked menu item. */
  initialActiveIndex?: number;
  onSelect?: (item: CommandItem) => void;
  onEscape?: () => void;
  /** Wrap ArrowUp/ArrowDown at the ends; defaults to `true`. */
  loop?: boolean;
}

export interface CommandListEntry {
  item: CommandItem;
  /** Index in the flat filtered list (stable while the query is unchanged). */
  index: number;
}

export interface CommandListGroup {
  key: string;
  label?: string;
  entries: readonly CommandListEntry[];
}

export interface CommandListHandle {
  query: string;
  setQuery: (value: string) => void;
  filtered: readonly CommandItem[];
  groups: readonly CommandListGroup[];
  activeIndex: number;
  activeItem: CommandItem | undefined;
  listId: string;
  activeDescendant: string | undefined;
  itemId: (index: number) => string;
  getInputProps: () => {
    role: "combobox";
    "aria-expanded": true;
    "aria-controls": string;
    "aria-autocomplete": "list";
    "aria-activedescendant": string | undefined;
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  };
  getListProps: () => { id: string; role: "listbox" };
  getItemProps: (
    item: CommandItem,
    index: number,
  ) => {
    id: string;
    role: "option";
    "aria-selected": boolean;
    "aria-disabled": boolean | undefined;
    "data-active": "true" | undefined;
    "data-checked": "true" | undefined;
    tabIndex: -1;
    disabled: boolean | undefined;
    ref: RefObject<HTMLButtonElement | null> | undefined;
    onMouseEnter: () => void;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  };
  select: (item: CommandItem) => void;
}

function flatten(items?: readonly CommandItem[], groups?: readonly CommandGroup[]): CommandItem[] {
  const flat: CommandItem[] = [];
  if (groups !== undefined) {
    for (const group of groups) {
      for (const item of group.items) {
        flat.push(
          item.group === undefined && group.label !== undefined
            ? { ...item, group: group.label }
            : item,
        );
      }
    }
  }
  if (items !== undefined) flat.push(...items);
  return flat;
}

/** Pure filter helper; also exported for tests/toolbar composition. */
export function filterCommandItems(
  items: readonly CommandItem[],
  query: string,
): readonly CommandItem[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items;
  return items.filter((item) => {
    const haystack = `${item.label} ${item.group ?? ""} ${(item.keywords ?? []).join(" ")}`
      .toLowerCase()
      .trim();
    return tokens.every((token) => haystack.includes(token));
  });
}

function firstEnabledIndex(items: readonly CommandItem[]): number {
  return items.findIndex((item) => item.disabled !== true);
}

export function useCommandList({
  items,
  groups,
  initialActiveIndex,
  onSelect,
  onEscape,
  loop = true,
}: CommandListOptions): CommandListHandle {
  const flatItems = useMemo(() => flatten(items, groups), [items, groups]);
  const [query, setQueryState] = useState("");
  const [activeIndex, setActiveIndexState] = useState(() => {
    const candidate = flatItems[initialActiveIndex ?? -1];
    if (candidate !== undefined && candidate.disabled !== true) {
      return initialActiveIndex ?? -1;
    }
    return firstEnabledIndex(flatItems);
  });
  const activeElementRef = useRef<HTMLButtonElement | null>(null);
  const rawId = useId();
  const listId = `ui-command-${rawId.replace(/:/g, "")}`;

  const filtered = useMemo(() => filterCommandItems(flatItems, query), [flatItems, query]);

  const resolvedIndex = useMemo(() => {
    if (filtered.length === 0) return -1;
    const current = filtered[activeIndex];
    if (current !== undefined && current.disabled !== true) return activeIndex;
    return firstEnabledIndex(filtered);
  }, [activeIndex, filtered]);

  const activeItem = resolvedIndex >= 0 ? filtered[resolvedIndex] : undefined;

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeIndex is the scroll trigger; the ref itself is not reactive
  useEffect(() => {
    const element = activeElementRef.current;
    if (element !== null && typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "nearest" });
    }
  }, [resolvedIndex]);

  const grouped = useMemo<readonly CommandListGroup[]>(() => {
    const map = new Map<string, { label?: string; entries: CommandListEntry[] }>();
    filtered.forEach((item, index) => {
      const key = item.group ?? "";
      const existing = map.get(key);
      if (existing !== undefined) {
        existing.entries.push({ item, index });
      } else {
        map.set(key, {
          ...(item.group !== undefined ? { label: item.group } : {}),
          entries: [{ item, index }],
        });
      }
    });
    return [...map.entries()].map(([key, group]) => ({
      key: key === "" ? "__ungrouped" : key,
      ...(group.label !== undefined ? { label: group.label } : {}),
      entries: group.entries,
    }));
  }, [filtered]);

  const itemId = useCallback((index: number) => `${listId}-option-${index}`, [listId]);

  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);
      setActiveIndexState(firstEnabledIndex(filterCommandItems(flatItems, value)));
    },
    [flatItems],
  );

  const select = useCallback(
    (item: CommandItem) => {
      if (item.disabled === true) return;
      onSelect?.(item);
    },
    [onSelect],
  );

  const move = useCallback(
    (delta: 1 | -1) => {
      const selectable: number[] = [];
      filtered.forEach((item, index) => {
        if (item.disabled !== true) selectable.push(index);
      });
      if (selectable.length === 0) return;
      const currentPosition = selectable.indexOf(resolvedIndex);
      let nextPosition: number;
      if (currentPosition === -1) {
        nextPosition = delta > 0 ? 0 : selectable.length - 1;
      } else if (loop) {
        nextPosition = (currentPosition + delta + selectable.length) % selectable.length;
      } else {
        nextPosition = Math.min(selectable.length - 1, Math.max(0, currentPosition + delta));
      }
      const target = selectable[nextPosition];
      if (target !== undefined) setActiveIndexState(target);
    },
    [filtered, loop, resolvedIndex],
  );

  const jump = useCallback(
    (edge: "first" | "last") => {
      const selectable = filtered
        .map((item, index) => (item.disabled === true ? undefined : index))
        .filter((index): index is number => index !== undefined);
      const target = edge === "first" ? selectable[0] : selectable.at(-1);
      if (target !== undefined) setActiveIndexState(target);
    },
    [filtered],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          move(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          move(-1);
          break;
        case "Home":
          event.preventDefault();
          jump("first");
          break;
        case "End":
          event.preventDefault();
          jump("last");
          break;
        case "Enter":
          if (activeItem !== undefined && activeItem.disabled !== true) {
            event.preventDefault();
            select(activeItem);
          }
          break;
        case "Escape":
          event.preventDefault();
          onEscape?.();
          break;
        default:
          break;
      }
    },
    [activeItem, jump, move, onEscape, select],
  );

  const getInputProps = useCallback(
    () => ({
      role: "combobox" as const,
      "aria-expanded": true as const,
      "aria-controls": listId,
      "aria-autocomplete": "list" as const,
      "aria-activedescendant": activeItem !== undefined ? itemId(resolvedIndex) : undefined,
      value: query,
      onChange: (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
      onKeyDown,
    }),
    [activeItem, itemId, listId, onKeyDown, query, resolvedIndex, setQuery],
  );

  const getListProps = useCallback(() => ({ id: listId, role: "listbox" as const }), [listId]);

  const getItemProps = useCallback(
    (item: CommandItem, index: number) => ({
      id: itemId(index),
      role: "option" as const,
      "aria-selected": resolvedIndex === index || item.checked === true,
      "aria-disabled": item.disabled === true ? true : undefined,
      "data-active": resolvedIndex === index ? ("true" as const) : undefined,
      "data-checked": item.checked === true ? ("true" as const) : undefined,
      tabIndex: -1 as const,
      disabled: item.disabled,
      ref: resolvedIndex === index ? activeElementRef : undefined,
      onMouseEnter: () => {
        if (item.disabled !== true) setActiveIndexState(index);
      },
      onClick: () => select(item),
    }),
    [itemId, resolvedIndex, select],
  );

  return {
    query,
    setQuery,
    filtered,
    groups: grouped,
    activeIndex: resolvedIndex,
    activeItem,
    listId,
    activeDescendant: activeItem !== undefined ? itemId(resolvedIndex) : undefined,
    itemId,
    getInputProps,
    getListProps,
    getItemProps,
    select,
  };
}
