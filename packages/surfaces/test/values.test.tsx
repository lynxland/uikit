import { ApiError } from "@lynxland/uikit-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import type { FieldView } from "../src/fields";
import {
  Avatar,
  CodeEditor,
  EmptyState,
  ErrorState,
  FieldValue,
  formatRelativeTime,
  JsonField,
  MetricChart,
  type MetricSeries,
  RelativeTime,
  SecretValue,
  Separator,
  StatCard,
  StatusBadge,
  StatusDot,
  statusTone,
} from "../src/values";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

function withAdapter(node: ReactNode) {
  return <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>;
}

function CodeEditorMaskHarness() {
  const [masked, setMasked] = useState(true);
  const [value, setValue] = useState("SECRET=abc\nTOKEN=def");
  return (
    <CodeEditor
      value={value}
      onChange={setValue}
      masked={masked}
      onMaskedChange={setMasked}
      aria-label="Secrets"
    />
  );
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

describe("StatusDot", () => {
  it("renders semantic tones and an optional accessible label", () => {
    const { rerender } = render(withAdapter(<StatusDot tone="success" />));
    const decorative = document.querySelector(".ui-status-dot");
    expect(decorative?.getAttribute("data-tone")).toBe("success");
    expect(decorative?.getAttribute("aria-hidden")).toBe("true");

    rerender(withAdapter(<StatusDot tone="danger" label="Service failed" pulse />));
    const labelled = screen.getByRole("img", { name: "Service failed" });
    expect(labelled.getAttribute("data-tone")).toBe("danger");
    expect(labelled.className).toContain("ui-status-dot--pulse");
  });

  it("lets aria-label win over label", () => {
    render(withAdapter(<StatusDot tone="warning" label="Ignored" aria-label="Deploying" />));
    expect(screen.getByRole("img", { name: "Deploying" })).toBeTruthy();
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
      withAdapter(
        <RelativeTime value={value} now={now} locale="en" format="long" numeric="always" />,
      ),
    );
    expect(screen.getByText("2 minutes ago")).toBeTruthy();
  });

  it("renders a fallback for invalid dates", () => {
    render(withAdapter(<RelativeTime value="not-a-date" fallback="unknown" />));
    expect(screen.getByText("unknown")).toBeTruthy();
  });

  it("uses bounded date-fns-like distance wording", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const ago = (milliseconds: number) =>
      formatRelativeTime(new Date(now.getTime() - milliseconds), now, "en", "auto", "distance");

    expect(ago(20_000)).toBe("less than a minute ago");
    expect(ago(60_000)).toBe("1 minute ago");
    expect(ago(5 * 60_000)).toBe("5 minutes ago");
    expect(ago(60 * 60_000)).toBe("about 1 hour ago");
    expect(ago(3 * 60 * 60_000)).toBe("about 3 hours ago");
    expect(ago(26 * 60 * 60_000)).toBe("1 day ago");
    expect(ago(3 * 24 * 60 * 60_000)).toBe("3 days ago");
    expect(ago(40 * 24 * 60 * 60_000)).toBe("about 1 month ago");
    expect(ago(100 * 24 * 60 * 60_000)).toBe("3 months ago");
    expect(ago(13 * 30 * 24 * 60 * 60_000)).toBe("about 1 year ago");
    expect(ago(2 * 365 * 24 * 60 * 60_000)).toBe("2 years ago");
    expect(
      formatRelativeTime(new Date(now.getTime() + 5 * 60_000), now, "en", "auto", "distance"),
    ).toBe("in 5 minutes");
  });
});

describe("Avatar", () => {
  it("derives initials and exposes the alt label", () => {
    render(withAdapter(<Avatar alt="Ada Lovelace" />));
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toBeTruthy();
    expect(screen.getByText("AL")).toBeTruthy();
  });

  it("falls back on an image error and can show a status dot", () => {
    render(withAdapter(<Avatar src="broken.png" alt="Ada Lovelace" status="success" />));
    const image = document.querySelector(".ui-avatar__image");
    expect(image).toBeTruthy();
    fireEvent.error(image as HTMLImageElement);
    expect(document.querySelector(".ui-avatar__image")).toBeNull();
    expect(screen.getByText("AL")).toBeTruthy();
    expect(document.querySelector(".ui-avatar__status")).toBeTruthy();
  });

  it("accepts an explicit fallback and numeric size", () => {
    render(withAdapter(<Avatar alt="Ada" fallback="?" size={40} />));
    const avatar = document.querySelector(".ui-avatar") as HTMLElement;
    expect(avatar.style.width).toBe("40px");
    expect(avatar.getAttribute("data-size")).toBe("custom");
    expect(screen.getByText("?")).toBeTruthy();
  });
});

describe("Separator", () => {
  it("is decorative by default", () => {
    render(withAdapter(<Separator orientation="vertical" />));
    const separator = document.querySelector(".ui-separator") as HTMLElement;
    expect(separator.getAttribute("aria-hidden")).toBe("true");
    expect(separator.getAttribute("role")).toBeNull();
    expect(separator.className).toContain("ui-separator--vertical");
  });

  it("exposes role and orientation when non-decorative", () => {
    render(withAdapter(<Separator decorative={false} label="or" />));
    const separator = document.querySelector(".ui-separator") as HTMLElement;
    expect(separator.getAttribute("role")).toBe("separator");
    expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
    expect(screen.getByText("or")).toBeTruthy();
  });
});

describe("StatCard", () => {
  it("renders icon, actions, footer and an anchor when href is set", () => {
    render(
      withAdapter(
        <StatCard
          label="Deploys"
          value={42}
          hint="last week"
          icon={<span data-testid="stat-icon">*</span>}
          actions={<button type="button">Open</button>}
          footer={<span>footer</span>}
          href="/deployments"
          className="stat-custom"
          valueClassName="stat-value-custom"
        />,
      ),
    );

    expect(screen.getByTestId("stat-icon")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open" })).toBeTruthy();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/deployments");
    expect(link.textContent).toContain("Deploys");
    expect(link.textContent).toContain("42");
    expect(link.textContent).not.toContain("Open");
    expect(screen.getByText("footer")).toBeTruthy();
    expect(screen.getByText("42").className).toContain("stat-value-custom");
    expect(document.querySelector(".ui-stat-card")?.className).toContain("stat-custom");
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

describe("CodeEditor", () => {
  it("renders line numbers and forwards edits", () => {
    const onChange = vi.fn();
    const { container } = render(
      withAdapter(
        <CodeEditor
          value={"A=1\nB=2\nC=3"}
          onChange={onChange}
          language="properties"
          aria-label="Environment variables"
        />,
      ),
    );
    const gutter = container.querySelector(".ui-code-editor__gutter");
    expect(gutter?.textContent).toBe("1\n2\n3");
    expect(container.querySelector(".ui-code-editor")?.getAttribute("data-language")).toBe(
      "properties",
    );

    const input = screen.getByRole("textbox", { name: "Environment variables" });
    fireEvent.change(input, { target: { value: "A=9" } });
    expect(onChange).toHaveBeenCalledWith("A=9");
  });

  it("masks without rewriting the draft and reveals in place", () => {
    const { container } = render(withAdapter(<CodeEditorMaskHarness />));
    const input = screen.getByRole("textbox", { name: "Secrets" }) as HTMLTextAreaElement;
    expect(input.value).toBe("SECRET=abc\nTOKEN=def");
    expect(container.querySelector(".ui-code-editor")?.getAttribute("data-masked")).toBe("true");
    expect(container.querySelector(".ui-code-editor__mask")?.textContent).toBe(
      "••••••••••\n•••••••••",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reveal contents" }));
    expect(input.value).toBe("SECRET=abc\nTOKEN=def");
    expect(container.querySelector(".ui-code-editor")?.getAttribute("data-masked")).toBeNull();
    expect(container.querySelector(".ui-code-editor__mask")).toBeNull();

    fireEvent.change(input, { target: { value: "SECRET=xyz\nTOKEN=def" } });
    fireEvent.click(screen.getByRole("button", { name: "Hide contents" }));
    expect((screen.getByRole("textbox", { name: "Secrets" }) as HTMLTextAreaElement).value).toBe(
      "SECRET=xyz\nTOKEN=def",
    );
  });

  it("supports readOnly and hiding the gutter", () => {
    const { container } = render(
      withAdapter(
        <CodeEditor value="hello" readOnly lineNumbers={false} aria-label="Read only editor" />,
      ),
    );
    const input = screen.getByRole("textbox", { name: "Read only editor" }) as HTMLTextAreaElement;
    expect(input.readOnly).toBe(true);
    expect(container.querySelector(".ui-code-editor__gutter")).toBeNull();
  });

  it("lets a custom renderer replace the textarea", () => {
    render(
      withAdapter(
        <CodeEditor
          value="value"
          language="yaml"
          aria-label="Custom"
          render={({ value, language }) => (
            <div data-testid="custom-renderer">{`${language}:${value}`}</div>
          )}
        />,
      ),
    );
    expect(screen.getByTestId("custom-renderer").textContent).toBe("yaml:value");
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

describe("MetricChart", () => {
  const points = (start: number, values: readonly number[]) =>
    values.map((v, index) => ({ t: start + index * 60_000, v }));

  const alpha: MetricSeries = { key: "alpha", label: "Alpha", points: points(0, [10, 12, 8]) };
  const beta: MetricSeries = { key: "beta", label: "Beta", points: points(0, [2, 4, 3]) };

  it("derives stable colours from the series key, not the array index", () => {
    const { container, rerender } = render(withAdapter(<MetricChart series={[alpha, beta]} />));
    const colorOf = (key: string) =>
      container.querySelector(`polyline[data-series-key="${key}"]`)?.getAttribute("style");
    const alphaColor = colorOf("alpha");
    const betaColor = colorOf("beta");
    expect(alphaColor).toBeTruthy();
    expect(betaColor).toBeTruthy();
    expect(alphaColor).not.toBe(betaColor);

    rerender(withAdapter(<MetricChart series={[beta, alpha]} />));
    expect(colorOf("alpha")).toBe(alphaColor);
    expect(colorOf("beta")).toBe(betaColor);
  });

  it("prefers an explicit series colour", () => {
    const { container } = render(
      withAdapter(
        <MetricChart series={[{ ...alpha, color: "rgb(255, 0, 0)" }]} showLegend={false} />,
      ),
    );
    const line = container.querySelector('polyline[data-series-key="alpha"]');
    expect(line?.getAttribute("style")).toContain("rgb(255, 0, 0)");
  });

  it("probes past palette collisions for series that hash to the same slot", () => {
    const read: MetricSeries = {
      key: "block-read",
      label: "read",
      points: points(0, [1, 2]),
    };
    const write: MetricSeries = {
      key: "block-write",
      label: "write",
      points: points(0, [2, 3]),
    };
    const { container } = render(withAdapter(<MetricChart series={[read, write]} />));
    const colorOf = (key: string) =>
      container.querySelector(`polyline[data-series-key="${key}"]`)?.getAttribute("style");
    expect(colorOf("block-read")).toBeTruthy();
    expect(colorOf("block-read")).not.toBe(colorOf("block-write"));
  });

  it("renders y-axis ticks, units, thresholds and area fill", () => {
    const { container } = render(
      withAdapter(
        <MetricChart
          series={[alpha]}
          showYAxis
          area
          unit="%"
          thresholds={[15]}
          formatValue={(value) => value.toFixed(0)}
        />,
      ),
    );
    const ticks = container.querySelectorAll(".ui-metric-chart__y-tick");
    expect(ticks).toHaveLength(3);
    expect(ticks[0]?.textContent).toContain("%");
    expect(container.querySelector(".ui-metric-chart__area")).toBeTruthy();
    expect(container.querySelectorAll(".ui-metric-chart__threshold")).toHaveLength(1);
    expect(container.querySelector(".ui-metric-chart__legend")?.textContent).toContain("8%");
  });

  it("honours showLegend=false and reports an empty window", () => {
    const { container, rerender } = render(
      withAdapter(<MetricChart series={[alpha]} showLegend={false} />),
    );
    expect(container.querySelector(".ui-metric-chart__legend")).toBeNull();

    rerender(withAdapter(<MetricChart series={[]} empty="Nothing sampled" />));
    expect(screen.getByTestId("metric-chart-empty").textContent).toBe("Nothing sampled");
  });

  it("exposes a screen-reader summary table", () => {
    render(withAdapter(<MetricChart series={[alpha, beta]} ariaLabel="CPU chart" />));
    const summary = screen.getByTestId("metric-chart-summary");
    expect(summary.textContent).toContain("Alpha");
    expect(summary.textContent).toContain("12");
    expect(summary.textContent).toContain("Beta");
  });

  it("shows a pointer readout at the hovered time", () => {
    const { container } = render(withAdapter(<MetricChart series={[alpha]} />));
    const svg = container.querySelector("svg.ui-metric-chart__plot");
    expect(svg).toBeTruthy();
    if (svg === null) return;
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    });
    fireEvent.pointerMove(svg, { clientX: 0 });
    expect(screen.getByTestId("metric-chart-tooltip").textContent).toContain("10");
  });
});
