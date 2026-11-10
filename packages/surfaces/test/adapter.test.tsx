import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UiAdapterProvider, useUiAdapter } from "../src/adapter";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

function Probe() {
  const adapter = useUiAdapter();
  return <span>{adapter === testAdapter ? "same-adapter" : "other-adapter"}</span>;
}

describe("UiAdapterProvider", () => {
  it("throws a descriptive error when no provider is present", () => {
    expect(() => render(<Probe />)).toThrow(/UiAdapterProvider/);
  });

  it("exposes the injected adapter", () => {
    render(
      <UiAdapterProvider adapter={testAdapter}>
        <Probe />
      </UiAdapterProvider>,
    );
    expect(screen.getByText("same-adapter")).toBeTruthy();
  });
});
