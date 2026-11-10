import { toast } from "@lynxland/uikit-surfaces";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PresetProvider } from "../src";
import "./setup";

beforeEach(() => toast.clear());
afterEach(() => {
  toast.clear();
  cleanup();
});

describe("PresetProvider", () => {
  it("installs the toast viewport by default", () => {
    render(
      <PresetProvider>
        <div>Preset app</div>
      </PresetProvider>,
    );

    act(() => {
      toast.success("Saved from a preset");
    });

    const viewport = screen.getByTestId("toast-viewport");
    expect(viewport.getAttribute("aria-live")).toBe("polite");
    expect(viewport.textContent).toContain("Saved from a preset");
  });
});
