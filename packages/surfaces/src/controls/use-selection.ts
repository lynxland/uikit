import { useCallback, useMemo, useState } from "react";

export interface UseSelectionOptions<ID> {
  /**
   * IDs in the current scope (usually the visible/filtered rows). Required for
   * meaningful `allSelected`/`someSelected` and for `selectAll()` without an
   * explicit argument.
   */
  ids?: readonly ID[];
  /** Controlled selection; omit to let the hook own the state. */
  selected?: ReadonlySet<ID>;
  defaultSelected?: Iterable<ID>;
  onSelectedChange?: (selected: ReadonlySet<ID>) => void;
}

export interface SelectionState<ID> {
  selected: ReadonlySet<ID>;
  isSelected(id: ID): boolean;
  toggle(id: ID): void;
  /** Selects the option `ids` or, when omitted, the hook's `ids` scope. */
  selectAll(ids?: readonly ID[]): void;
  clear(): void;
  allSelected: boolean;
  someSelected: boolean;
}

/**
 * Headless selection state for cards/lists that do not use `DataTable`.
 * Controlled (`selected`) or uncontrolled (`defaultSelected`), with no
 * collection, query or Router dependency.
 */
export function useSelection<ID>(options: UseSelectionOptions<ID> = {}): SelectionState<ID> {
  const { ids, selected: controlled, defaultSelected, onSelectedChange } = options;
  const [internal, setInternal] = useState<ReadonlySet<ID>>(() => new Set(defaultSelected));
  const selected = controlled ?? internal;

  const commit = useCallback(
    (next: ReadonlySet<ID>) => {
      if (controlled === undefined) setInternal(next);
      onSelectedChange?.(next);
    },
    [controlled, onSelectedChange],
  );

  const isSelected = useCallback((id: ID) => selected.has(id), [selected]);

  const toggle = useCallback(
    (id: ID) => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      commit(next);
    },
    [selected, commit],
  );

  const selectAll = useCallback(
    (nextIds?: readonly ID[]) => {
      commit(new Set(nextIds ?? ids ?? []));
    },
    [ids, commit],
  );

  const clear = useCallback(() => commit(new Set<ID>()), [commit]);

  const allSelected = ids !== undefined && ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = !allSelected && ids !== undefined && ids.some((id) => selected.has(id));

  return useMemo(
    () => ({
      selected,
      isSelected,
      toggle,
      selectAll,
      clear,
      allSelected,
      someSelected,
    }),
    [selected, isSelected, toggle, selectAll, clear, allSelected, someSelected],
  );
}
