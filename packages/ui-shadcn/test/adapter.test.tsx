import type { UiAdapter } from "@lynxland/uikit-surfaces/adapter";
import { useUiAdapter } from "@lynxland/uikit-surfaces/adapter";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShadcnUiProvider, shadcnAdapter } from "../src";
import "./setup";

const typedAdapter: UiAdapter = shadcnAdapter;

function Probe() {
  const adapter = useUiAdapter();
  return <span data-testid="probe">{adapter === shadcnAdapter ? "shadcn" : "other"}</span>;
}

describe("shadcnAdapter", () => {
  it("satisfies the UiAdapter contract", () => {
    expect(typedAdapter).toBe(shadcnAdapter);
    expect(shadcnAdapter.Button).toBeDefined();
    expect(shadcnAdapter.Select).toBeDefined();
    expect(shadcnAdapter.Tooltip).toBeDefined();
    expect(shadcnAdapter.icons.ChevronDown).toBeDefined();
    expect(typeof shadcnAdapter.cx).toBe("function");
  });

  it("is injected by ShadcnUiProvider", () => {
    render(
      <ShadcnUiProvider>
        <Probe />
      </ShadcnUiProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("shadcn");
  });

  it("merges class names through cx", () => {
    expect(shadcnAdapter.cx?.("px-2", "px-4", false, undefined)).toBe("px-4");
  });
});
