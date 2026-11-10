import { ApiError } from "@lynxland/uikit-core";
import type { CollectionHandle } from "@lynxland/uikit-react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import type { Column } from "../src/controls";
import { CollectionView, type PagerControls } from "../src/views";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  status: string;
}

const rows: Row[] = [
  { id: "1", name: "Alpha", status: "active" },
  { id: "2", name: "Beta", status: "paused" },
];

const columns: Column<Row>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name, sortField: "name" },
  { id: "status", header: "Status", accessor: (row) => row.status },
];

function handle(overrides: Partial<CollectionHandle<Row>> = {}): CollectionHandle<Row> {
  return {
    rows: [],
    page: undefined,
    request: { window: { kind: "all" } },
    status: "success",
    emptyReason: undefined,
    error: null,
    total: undefined,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

function renderView(node: ReactNode) {
  return render(<UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>);
}

describe("CollectionView", () => {
  it("presents idle as loading", () => {
    renderView(<CollectionView list={handle({ status: "idle" })} columns={columns} />);
    expect(screen.getByTestId("async-state").getAttribute("data-status")).toBe("loading");
    expect(screen.getByTestId("loading-state")).toBeTruthy();
  });

  it("renders the structured empty state", () => {
    renderView(
      <CollectionView
        list={handle({ status: "empty" })}
        columns={columns}
        empty={{ title: "No widgets", description: "Create one to start." }}
      />,
    );
    expect(screen.getByTestId("async-state").getAttribute("data-status")).toBe("empty");
    expect(screen.getByText("No widgets")).toBeTruthy();
  });

  it("renders the error state with the caller's describer and retry", () => {
    const refetch = vi.fn();
    renderView(
      <CollectionView
        list={handle({
          status: "error",
          error: new ApiError("server", { status: 500, message: "boom" }),
          refetch,
        })}
        columns={columns}
        describeError={() => "Custom failure"}
      />,
    );
    expect(screen.getByText("Custom failure")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders rows and reports sorting changes", () => {
    const onSortChange = vi.fn();
    renderView(
      <CollectionView
        list={handle({ rows, total: rows.length })}
        columns={columns}
        sort={[]}
        onSortChange={onSortChange}
      />,
    );
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSortChange).toHaveBeenLastCalledWith([{ field: "name", dir: "asc" }]);
  });

  it("forwards row clicks to the caller", () => {
    const onRowClick = vi.fn();
    renderView(
      <CollectionView list={handle({ rows })} columns={columns} onRowClick={onRowClick} />,
    );
    fireEvent.click(screen.getByText("Alpha"));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it("reports filter text changes with the current filter leaves", () => {
    const onFilterChange = vi.fn();
    renderView(
      <CollectionView
        list={handle({ rows })}
        columns={columns}
        filters={[{ field: "name", kind: "text" }]}
        filterState={{ text: "", filters: [] }}
        onFilterChange={onFilterChange}
      />,
    );
    fireEvent.change(screen.getByTestId("filter-search"), { target: { value: "alp" } });
    expect(onFilterChange).toHaveBeenLastCalledWith({ text: "alp", filters: [] });
  });

  it("clears text and filters together", () => {
    const onFilterChange = vi.fn();
    renderView(
      <CollectionView
        list={handle({ rows })}
        columns={columns}
        filters={[{ field: "name", kind: "text" }]}
        filterState={{
          text: "alp",
          filters: [{ field: "name", op: "contains", value: "alp" }],
        }}
        onFilterChange={onFilterChange}
      />,
    );
    fireEvent.click(screen.getByTestId("filter-clear"));
    expect(onFilterChange).toHaveBeenLastCalledWith({ text: "", filters: [] });
  });

  it("derives pager controls from pagerModel", () => {
    const pager: PagerControls = {
      mode: "offset",
      canPrev: true,
      canNext: true,
      pageSize: 10,
      prev: vi.fn(),
      next: vi.fn(),
      setPageSize: vi.fn(),
    };
    renderView(
      <CollectionView
        list={handle({
          rows,
          total: 42,
          page: { rows, paging: { kind: "offset", total: 42, offset: 10, size: 10 } },
        })}
        columns={columns}
        pagerModel={pager}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(pager.prev).toHaveBeenCalledTimes(1);
    expect(pager.next).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Page size"), { target: { value: "20" } });
    expect(pager.setPageSize).toHaveBeenCalledWith(20);
  });

  it("prefers a pager node override", () => {
    renderView(
      <CollectionView
        list={handle({ rows })}
        columns={columns}
        pager={<div data-testid="custom-pager">custom pager</div>}
      />,
    );
    expect(screen.getByTestId("custom-pager")).toBeTruthy();
    expect(screen.queryByTestId("pager")).toBeNull();
  });

  it("renders toolbar and tabs slots", () => {
    renderView(
      <CollectionView
        list={handle({ rows })}
        columns={columns}
        toolbar={<button type="button">Export</button>}
        tabs={<div data-testid="tabs-slot">Tabs</div>}
      />,
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
    expect(screen.getByTestId("tabs-slot")).toBeTruthy();
  });
});
