import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { ToastProvider, toast } from "../src/values";
import { testAdapter } from "./test-adapter";

beforeEach(() => {
  toast.clear();
});

afterEach(() => {
  toast.clear();
  cleanup();
  vi.useRealTimers();
});

function renderToasts(node: ReactNode, limit?: number) {
  return render(
    <UiAdapterProvider adapter={testAdapter}>
      <ToastProvider {...(limit !== undefined ? { limit } : {})}>{node}</ToastProvider>
    </UiAdapterProvider>,
  );
}

describe("ToastProvider", () => {
  it("renders an aria-live viewport with tone roles and a close button", () => {
    renderToasts(<div>App</div>);
    act(() => {
      toast.success("Saved locally");
      toast.error("Deploy failed");
    });

    const viewport = screen.getByTestId("toast-viewport");
    expect(viewport.getAttribute("aria-live")).toBe("polite");
    expect(screen.getAllByTestId("toast-item")).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toContain("Saved locally");
    expect(screen.getByRole("alert").textContent).toContain("Deploy failed");

    const dismiss = screen.getAllByTestId("toast-dismiss")[0];
    if (dismiss !== undefined) fireEvent.click(dismiss);
    expect(screen.getAllByTestId("toast-item")).toHaveLength(1);
    expect(screen.queryByText("Saved locally")).toBeNull();
  });

  it("keeps the newest toasts up to the stack limit", () => {
    renderToasts(<div>App</div>, 2);
    act(() => {
      toast.info("one");
      toast.info("two");
      toast.info("three");
    });

    const items = screen.getAllByTestId("toast-item");
    expect(items).toHaveLength(2);
    expect(screen.queryByText("one")).toBeNull();
    expect(screen.getByText("two")).toBeTruthy();
    expect(screen.getByText("three")).toBeTruthy();
  });

  it("auto-dismisses after the duration and pauses on hover", () => {
    vi.useFakeTimers();
    renderToasts(<div>App</div>);
    act(() => {
      toast.success("Saved", { duration: 1000 });
    });

    const item = screen.getByTestId("toast-item");
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.mouseEnter(item);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("toast-item")).toBeTruthy();

    fireEvent.mouseLeave(item);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId("toast-item")).toBeNull();
  });

  it("supports an action and persistent duration", () => {
    const onClick = vi.fn();
    renderToasts(<div>App</div>);
    act(() => {
      toast.info("Update ready", {
        duration: 0,
        action: { label: "Reload", onClick },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("toast-item")).toBeNull();
  });
});
