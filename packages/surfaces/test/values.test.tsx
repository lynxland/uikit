import { ApiError } from "@lynxland/uikit-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import type { FieldView } from "../src/fields";
import {
  EmptyState,
  ErrorState,
  FieldValue,
  JsonField,
  RelativeTime,
  SecretValue,
  StatusBadge,
  statusTone,
} from "../src/values";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

function withAdapter(node: ReactNode) {
  return <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>;
}

describe("StatusBadge", () => {
  it("maps statuses to semantic tones", () => {
    expect(statusTone("running")).toBe("success");
    expect(statusTone("failed")).toBe("danger");
    expect(statusTone("pending")).toBe("warning");
    expect(statusTone("custom")).toBe("neutral");
    expect(statusTone("custom", { custom: "info" })).toBe("info");
  });

  it("renders the adapter badge with the derived tone", () => {
    render(withAdapter(<StatusBadge status="failed" />));
    expect(screen.getByText("failed")).toBeTruthy();
    expect(screen.getByTestId("badge").getAttribute("data-tone")).toBe("danger");
  });
});

describe("RelativeTime", () => {
  it("formats against the injected clock", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const value = new Date("2026-01-01T11:58:00Z");
    render(withAdapter(<RelativeTime value={value} now={now} locale="en" />));
    expect(screen.getByText(/2 min/)).toBeTruthy();
    const element = screen.getByText(/2 min/).closest("time");
    expect(element?.getAttribute("dateTime")).toBe(value.toISOString());
    expect(element?.getAttribute("title")).toBeTruthy();
  });

  it("supports the long Intl style", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const value = new Date("2026-01-01T11:58:00Z");
    render(
      withAdapter(<RelativeTime value={value} now={now} locale="en" format="long" numeric="always" />),
    );
    expect(screen.getByText("2 minutes ago")).toBeTruthy();
  });

  it("renders a fallback for invalid dates", () => {
    render(withAdapter(<RelativeTime value="not-a-date" fallback="unknown" />));
    expect(screen.getByText("unknown")).toBeTruthy();
  });
});

describe("JsonField", () => {
  it("shows formatted JSON in view mode", () => {
    render(withAdapter(<JsonField value={{ name: "widget", count: 2 }} label="Spec" />));
    expect(screen.getByText("Spec")).toBeTruthy();
    expect(screen.getByText(/"name": "widget"/)).toBeTruthy();
  });

  it("never writes invalid JSON back", () => {
    const onChange = vi.fn();
    render(withAdapter(<JsonField value={{ a: 1 }} onChange={onChange} label="Spec" />));
    fireEvent.click(screen.getByTestId("json-field-edit"));
    const input = screen.getByTestId("json-field-input");
    fireEvent.change(input, { target: { value: "{ bad" } });
    fireEvent.click(screen.getByTestId("json-field-apply"));
    expect(screen.getByTestId("json-field-error")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '{"a":2}' } });
    fireEvent.click(screen.getByTestId("json-field-apply"));
    expect(onChange).toHaveBeenCalledWith({ a: 2 });
  });
});

describe("FieldValue", () => {
  interface Row {
    id: string;
    name: string;
    count: number;
    active: boolean;
    status: string;
    ownerId: string;
  }

  const row: Row = {
    id: "r1",
    name: "Widget",
    count: 3,
    active: false,
    status: "running",
    ownerId: "u1",
  };

  const field = (
    overrides: Partial<FieldView<Row>> & Pick<FieldView<Row>, "name" | "kind">,
  ): FieldView<Row> => overrides;

  it("renders by kind", () => {
    render(
      withAdapter(
        <div>
          <FieldValue field={field({ name: "name", kind: "text" })} row={row} />
          <FieldValue field={field({ name: "count", kind: "number" })} row={row} />
          <FieldValue field={field({ name: "active", kind: "boolean" })} row={row} />
          <FieldValue
            field={field({
              name: "status",
              kind: "enum",
              options: [{ value: "running", label: "Running" }],
            })}
            row={row}
          />
        </div>,
      ),
    );
    expect(screen.getByText("Widget")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("No")).toBeTruthy();
    expect(screen.getByText("Running")).toBeTruthy();
  });

  it("renders a reference id when no lookup renderer is injected", () => {
    render(
      withAdapter(<FieldValue field={field({ name: "ownerId", kind: "reference" })} row={row} />),
    );
    expect(screen.getByText("u1")).toBeTruthy();
  });

  it("renders the empty marker", () => {
    render(
      withAdapter(
        <FieldValue field={field({ name: "name", kind: "text" })} row={{ ...row, name: "" }} />,
      ),
    );
    expect(screen.getByText("—")).toBeTruthy();
  });
});

describe("SecretValue", () => {
  it("masks by default and toggles reveal", () => {
    render(withAdapter(<SecretValue value="sk_live_123" label="API key" />));
    expect(screen.getByText("••••••••••••")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reveal API key" }));
    expect(screen.getByText("sk_live_123")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hide API key" }));
    expect(screen.getByText("••••••••••••")).toBeTruthy();
  });
});

describe("EmptyState / ErrorState", () => {
  it("renders structured empty content", () => {
    render(withAdapter(<EmptyState title="No rows" description="Try another filter" />));
    expect(screen.getByText("No rows")).toBeTruthy();
    expect(screen.getByText("Try another filter")).toBeTruthy();
  });

  it("describes API errors by kind and calls retry", () => {
    const onRetry = vi.fn();
    render(withAdapter(<ErrorState error={new ApiError("forbidden")} onRetry={onRetry} />));
    expect(screen.getByText("You do not have access to this resource.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
