import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHotkey } from "../src/values";

afterEach(cleanup);

function press(target: Element | Window, key: string, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(target, { key, ...init });
}

describe("useHotkey", () => {
  it("fires on the platform modifier and prevents the default", () => {
    const handler = vi.fn();
    renderHook(() => useHotkey({ key: "k", mod: true, handler }));

    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not fire without the required modifier", () => {
    const handler = vi.fn();
    renderHook(() => useHotkey({ key: "k", mod: true, handler }));
    press(window, "k");
    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores editable inputs by default and can opt out", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey({ key: "k", ctrl: true, handler }));
    const input = document.createElement("input");
    document.body.appendChild(input);
    press(input, "k", { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
    input.remove();
    unmount();

    renderHook(() => useHotkey({ key: "k", ctrl: true, ignoreEditable: false, handler }));
    const second = document.createElement("input");
    document.body.appendChild(second);
    press(second, "k", { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
    second.remove();
  });

  it("honours enabled, alt and shift requirements", () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useHotkey({ key: "p", alt: true, shift: true, enabled, handler }),
      { initialProps: { enabled: true } },
    );

    press(window, "p", { altKey: true });
    expect(handler).not.toHaveBeenCalled();
    press(window, "p", { altKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    press(window, "p", { altKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
