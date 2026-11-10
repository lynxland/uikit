import type { UiAdapter } from "@lynxland/uikit-surfaces/adapter";
import { useUiAdapter } from "@lynxland/uikit-surfaces/adapter";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlainUiProvider, plainAdapter } from "../src";
import "./setup";

const typedAdapter: UiAdapter = plainAdapter;

function Probe() {
  const adapter = useUiAdapter();
  return <span data-testid="probe">{adapter === plainAdapter ? "plain" : "other"}</span>;
}

describe("plainAdapter", () => {
  it("satisfies the UiAdapter contract", () => {
    expect(typedAdapter).toBe(plainAdapter);
    expect(plainAdapter.Button).toBeDefined();
    expect(plainAdapter.Input).toBeDefined();
    expect(plainAdapter.Select).toBeDefined();
    expect(plainAdapter.Table.Root).toBeDefined();
    expect(plainAdapter.icons.Loader).toBeDefined();
    expect(typeof plainAdapter.cx).toBe("function");
  });

  it("is injected by PlainUiProvider", () => {
    render(
      <PlainUiProvider>
        <Probe />
      </PlainUiProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("plain");
  });

  it("merges class names through cx", () => {
    expect(plainAdapter.cx?.("ui-plain-button", false, undefined, "extra")).toBe(
      "ui-plain-button extra",
    );
  });
});
