import { ApiError } from "@lynxland/uikit-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import {
  RouteErrorBoundary,
  ScopeSwitcher,
  type ScopeSwitcherItem,
  SectionCard,
  Stepper,
} from "../src/chrome";
import { testAdapter } from "./test-adapter";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function withAdapter(node: ReactNode) {
  return <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>;
}

let shouldThrow = false;

function Bomb() {
  if (shouldThrow) throw new Error("boom");
  return <div>Recovered</div>;
}

describe("SectionCard", () => {
  it("renders title, description, actions and children", () => {
    render(
      withAdapter(
        <SectionCard
          title="General"
          description="Workspace defaults"
          actions={<button type="button">Edit</button>}
        >
          <p>Card body</p>
        </SectionCard>,
      ),
    );
    expect(screen.getByText("General")).toBeTruthy();
    expect(screen.getByText("Workspace defaults")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(screen.getByText("Card body")).toBeTruthy();
  });
});

describe("ScopeSwitcher", () => {
  const items: ScopeSwitcherItem[] = [
    { value: "prod", label: "Production" },
    { value: "staging", label: "Staging" },
  ];

  it("is controlled and reports the selected value", () => {
    const onChange = vi.fn();
    render(
      withAdapter(<ScopeSwitcher items={items} value="prod" label="Project" onChange={onChange} />),
    );

    const select = screen.getByLabelText("Project") as HTMLSelectElement;
    expect(select.value).toBe("prod");
    fireEvent.change(select, { target: { value: "staging" } });
    expect(onChange).toHaveBeenCalledWith("staging");
  });
});

describe("Stepper", () => {
  it("renders controlled state and reports step clicks", () => {
    const onChange = vi.fn();
    render(
      withAdapter(
        <Stepper
          steps={[
            { key: "details", label: "Details" },
            { key: "review", label: "Review" },
            { key: "done", label: "Done" },
          ]}
          current={1}
          onChange={onChange}
          orientation="vertical"
        >
          <p>Step body</p>
        </Stepper>,
      ),
    );

    expect(screen.getByRole("button", { name: "Details" }).getAttribute("data-state")).toBe("done");
    expect(screen.getByRole("button", { name: "Review" }).getAttribute("aria-current")).toBe(
      "step",
    );
    expect(screen.getByRole("button", { name: "Done" }).getAttribute("data-state")).toBe("pending");
    expect(screen.getByText("Step body")).toBeTruthy();
    expect(screen.getByTestId("stepper").getAttribute("data-orientation")).toBe("vertical");

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe("RouteErrorBoundary", () => {
  it("renders an injected error (router errorComponent form)", () => {
    render(
      withAdapter(
        <RouteErrorBoundary
          error={new ApiError("server", { status: 500 })}
          reset={() => undefined}
        />,
      ),
    );
    expect(screen.getByTestId("route-error-boundary")).toBeTruthy();
    expect(screen.getByText("This page failed to load")).toBeTruthy();
    expect(screen.getByText("Server error 500: server.")).toBeTruthy();
  });

  it("catches render errors and recovers through reset/onRetry", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    shouldThrow = true;
    const reset = vi.fn(() => {
      shouldThrow = false;
    });
    const onRetry = vi.fn();

    render(
      withAdapter(
        <RouteErrorBoundary reset={reset} onRetry={onRetry}>
          <Bomb />
        </RouteErrorBoundary>,
      ),
    );

    expect(screen.getByText("boom")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Recovered")).toBeTruthy();
  });
});
