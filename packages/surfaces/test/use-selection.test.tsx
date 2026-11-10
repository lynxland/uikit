import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSelection } from "../src/controls";

describe("useSelection", () => {
  it("toggles, selects all and clears an uncontrolled selection", () => {
    const { result } = renderHook(() =>
      useSelection<string>({ ids: ["a", "b", "c"], defaultSelected: ["a"] }),
    );

    expect(result.current.selected).toEqual(new Set(["a"]));
    expect(result.current.isSelected("a")).toBe(true);
    expect(result.current.allSelected).toBe(false);
    expect(result.current.someSelected).toBe(true);

    act(() => result.current.toggle("b"));
    expect(result.current.selected).toEqual(new Set(["a", "b"]));
    expect(result.current.someSelected).toBe(true);

    act(() => result.current.selectAll());
    expect(result.current.selected).toEqual(new Set(["a", "b", "c"]));
    expect(result.current.allSelected).toBe(true);
    expect(result.current.someSelected).toBe(false);

    act(() => result.current.toggle("b"));
    expect(result.current.allSelected).toBe(false);
    expect(result.current.someSelected).toBe(true);

    act(() => result.current.selectAll(["c"]));
    expect(result.current.selected).toEqual(new Set(["c"]));

    act(() => result.current.clear());
    expect(result.current.selected.size).toBe(0);
    expect(result.current.allSelected).toBe(false);
    expect(result.current.someSelected).toBe(false);
  });

  it("reports changes without owning state when controlled", () => {
    const onSelectedChange = vi.fn();
    const selected: ReadonlySet<string> = new Set(["a"]);
    const { result } = renderHook(() =>
      useSelection<string>({ ids: ["a", "b"], selected, onSelectedChange }),
    );

    act(() => result.current.toggle("b"));
    expect(onSelectedChange).toHaveBeenCalledWith(new Set(["a", "b"]));
    expect(result.current.selected).toEqual(new Set(["a"]));
  });
});
