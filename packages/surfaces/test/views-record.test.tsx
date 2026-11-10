import { ApiError } from "@lynxland/uikit-core";
import type { RecordHandle } from "@lynxland/uikit-react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { RecordView, type RecordViewTab } from "../src/views";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  status: string;
}

const row: Row = { id: "1", name: "Alpha", status: "active" };

function handle(overrides: Partial<RecordHandle<Row>> = {}): RecordHandle<Row> {
  return {
    data: undefined,
    status: "success",
    error: null,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

function withAdapter(node: ReactNode) {
  return <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>;
}

function TabsHarness({ tabs }: { tabs: readonly RecordViewTab<Row>[] }) {
  const [active, setActive] = useState("overview");
  return (
    <RecordView
      record={handle({ data: row })}
      tabs={tabs}
      activeTab={active}
      onTabChange={setActive}
    />
  );
}

describe("RecordView", () => {
  it("renders the hero and fields without an h1", () => {
    const { container } = render(
      withAdapter(
        <RecordView
          record={handle({ data: row })}
          title={(data) => data.name}
          meta={(data) => `Status: ${data.status}`}
          actions={() => <button type="button">Delete</button>}
          fields={[{ name: "name", kind: "text", label: "Name" }]}
        />,
      ),
    );
    expect(screen.getByRole("heading", { level: 2, name: "Alpha" })).toBeTruthy();
    expect(screen.getByText("Status: active")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(screen.getByText("Name")).toBeTruthy();
    expect(container.querySelectorAll("h1")).toHaveLength(0);
  });

  it("renders tab content lazily and only for the active tab", () => {
    const overview = vi.fn(() => <div>Overview panel</div>);
    const history = vi.fn(() => <div>History panel</div>);
    const tabs: RecordViewTab<Row>[] = [
      { key: "overview", label: "Overview", render: overview },
      { key: "history", label: "History", render: history },
    ];

    render(withAdapter(<TabsHarness tabs={tabs} />));
    expect(overview).toHaveBeenCalledTimes(1);
    expect(history).not.toHaveBeenCalled();
    expect(screen.getByText("Overview panel")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    expect(history).toHaveBeenCalledTimes(1);
    expect(screen.getByText("History panel")).toBeTruthy();
    expect(screen.queryByText("Overview panel")).toBeNull();
  });

  it("presents idle as loading", () => {
    render(withAdapter(<RecordView record={handle({ status: "idle" })} />));
    expect(screen.getByTestId("async-state").getAttribute("data-status")).toBe("loading");
  });

  it("renders the error state", () => {
    render(
      withAdapter(
        <RecordView
          record={handle({
            status: "error",
            error: new ApiError("not-found", { message: "gone" }),
          })}
          errorTitle="Record unavailable"
        />,
      ),
    );
    expect(screen.getByText("Record unavailable")).toBeTruthy();
    expect(screen.getByText("Resource not found.")).toBeTruthy();
  });

  it("renders the default empty state for a missing record", () => {
    render(withAdapter(<RecordView record={handle({ status: "empty" })} />));
    expect(screen.getByText("Not found")).toBeTruthy();
  });
});
