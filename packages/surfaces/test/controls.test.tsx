import type { FilterValue } from "@lynxland/uikit-core";
import { ApiError } from "@lynxland/uikit-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider, useUiAdapter } from "../src/adapter";
import {
  AsyncState,
  type Column,
  ColumnPicker,
  type ColumnVisibility,
  DataTable,
  DateRangePicker,
  type DateRangeValue,
  FileTree,
  type FileTreeItem,
  FilterBar,
  Form,
  InputGroup,
  Pager,
  type RowSelection,
  SecretInput,
  Tabs,
} from "../src/controls";
import type { FilterField } from "../src/fields";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

function withAdapter(node: ReactNode) {
  return <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>;
}

function SecretInputHarness() {
  const [value, setValue] = useState("draft");
  return <SecretInput aria-label="API key" value={value} onChange={setValue} />;
}

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

describe("DataTable", () => {
  it("renders static rows with the caller's columns", () => {
    render(withAdapter(<DataTable rows={rows} columns={columns} getRowId={(row) => row.id} />));
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
  });

  it("supports keyboard row activation and per-row props", () => {
    const onRowClick = vi.fn();
    render(
      withAdapter(
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          onRowClick={onRowClick}
          getRowProps={(row) => ({
            "data-testid": `row-${row.id}`,
            "aria-label": `Open ${row.name}`,
          })}
        />,
      ),
    );
    const row = screen.getByTestId("row-1");
    expect(row.tabIndex).toBe(0);
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onRowClick).toHaveBeenLastCalledWith(rows[0]);
    fireEvent.click(screen.getByText("Beta"));
    expect(onRowClick).toHaveBeenLastCalledWith(rows[1]);
  });

  it("cycles the controlled sorting callback none → asc → desc → none", () => {
    const onSortingChange = vi.fn();
    const result = render(
      withAdapter(
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          onSortingChange={onSortingChange}
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSortingChange).toHaveBeenLastCalledWith([{ field: "name", dir: "asc" }]);

    result.rerender(
      withAdapter(
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          sorting={[{ field: "name", dir: "asc" }]}
          onSortingChange={onSortingChange}
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSortingChange).toHaveBeenLastCalledWith([{ field: "name", dir: "desc" }]);

    result.rerender(
      withAdapter(
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          sorting={[{ field: "name", dir: "desc" }]}
          onSortingChange={onSortingChange}
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSortingChange).toHaveBeenLastCalledWith([]);
  });

  it("reports row and select-all selection", () => {
    const onToggle = vi.fn();
    const onToggleAll = vi.fn();
    const selection: RowSelection<Row> = {
      selectedIds: new Set<string>(),
      onToggle,
      onToggleAll,
    };
    render(
      withAdapter(
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          selection={selection}
        />,
      ),
    );
    fireEvent.click(screen.getByLabelText("Select row 1"));
    expect(onToggle).toHaveBeenCalledWith("1", rows[0]);
    fireEvent.click(screen.getByLabelText("Select all rows"));
    expect(onToggleAll).toHaveBeenCalledWith(["1", "2"]);
  });

  it("renders the empty slot for an empty result", () => {
    render(
      withAdapter(
        <DataTable rows={[]} columns={columns} getRowId={(row) => row.id} empty="Nothing here" />,
      ),
    );
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });
});

function ColumnPickerHarness({ onChange }: { onChange?: (visibility: ColumnVisibility) => void }) {
  const [visibility, setVisibility] = useState<ColumnVisibility>({});
  return (
    <ColumnPicker
      columns={[
        { id: "name", label: "Name", hideable: false },
        { id: "status", label: "Status" },
        { id: "image", label: "Image" },
      ]}
      visibility={visibility}
      onVisibilityChange={(next) => {
        setVisibility(next);
        onChange?.(next);
      }}
    />
  );
}

describe("ColumnPicker", () => {
  it("toggles visibility, treats absent keys as visible and keeps the menu open", () => {
    const onChange = vi.fn();
    render(withAdapter(<ColumnPickerHarness onChange={onChange} />));

    fireEvent.click(screen.getByTestId("columns-picker"));
    const image = screen.getByTestId("column-toggle-image");
    expect(image.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(image);
    expect(onChange).toHaveBeenLastCalledWith({ image: false });
    expect(image.getAttribute("aria-checked")).toBe("false");
    // Checkbox items keep the menu open so several columns can be toggled.
    expect(screen.getByTestId("column-toggle-status")).toBeTruthy();

    fireEvent.click(screen.getByTestId("column-toggle-status"));
    expect(onChange).toHaveBeenLastCalledWith({ image: false, status: false });

    fireEvent.click(screen.getByTestId("column-toggle-image"));
    expect(onChange).toHaveBeenLastCalledWith({ image: true, status: false });
  });

  it("renders non-hideable columns as checked and disabled", () => {
    render(withAdapter(<ColumnPickerHarness />));
    fireEvent.click(screen.getByTestId("columns-picker"));
    const name = screen.getByTestId("column-toggle-name") as HTMLButtonElement;
    expect(name.getAttribute("aria-checked")).toBe("true");
    expect(name.disabled).toBe(true);
  });
});

const treeItems: FileTreeItem[] = [
  {
    id: "dynamic",
    label: "dynamic",
    type: "directory",
    children: [
      { id: "traefik.yml", label: "traefik.yml", type: "file" },
      { id: "acme.json", label: "acme.json", type: "file" },
    ],
  },
];

function FileTreeHarness({
  initialExpanded = ["dynamic"],
  onSelect,
}: {
  initialExpanded?: readonly string[];
  onSelect?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(initialExpanded));
  const [selected, setSelected] = useState("traefik.yml");
  return (
    <FileTree
      items={treeItems}
      expanded={expanded}
      onExpandedChange={setExpanded}
      selected={selected}
      onSelect={(id) => {
        setSelected(id);
        onSelect?.(id);
      }}
      aria-label="Traefik files"
    />
  );
}

describe("FileTree", () => {
  it("renders expanded state, selection and nesting semantics", () => {
    render(withAdapter(<FileTreeHarness />));
    const tree = screen.getByRole("tree", { name: "Traefik files" });
    expect(tree).toBeTruthy();

    const directory = screen.getByRole("treeitem", { name: "dynamic" });
    expect(directory.getAttribute("aria-expanded")).toBe("true");
    expect(directory.getAttribute("aria-level")).toBe("1");
    const file = screen.getByRole("treeitem", { name: "traefik.yml" });
    expect(file.getAttribute("aria-selected")).toBe("true");
    expect(file.getAttribute("aria-level")).toBe("2");
    expect(screen.getByRole("group")).toBeTruthy();

    fireEvent.click(directory);
    expect(directory.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("treeitem", { name: "traefik.yml" })).toBeNull();
  });

  it("selects files by click and Enter/Space", () => {
    const onSelect = vi.fn();
    render(withAdapter(<FileTreeHarness onSelect={onSelect} />));

    const file = screen.getByRole("treeitem", { name: "traefik.yml" });
    fireEvent.click(file);
    expect(onSelect).toHaveBeenLastCalledWith("traefik.yml");

    const other = screen.getByRole("treeitem", { name: "acme.json" });
    other.focus();
    fireEvent.keyDown(other, { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith("acme.json");
    fireEvent.keyDown(other, { key: " " });
    expect(onSelect).toHaveBeenLastCalledWith("acme.json");
  });

  it("expands/collapses with ArrowLeft/ArrowRight and moves focus with arrows", () => {
    render(withAdapter(<FileTreeHarness initialExpanded={[]} />));
    const directory = screen.getByRole("treeitem", { name: "dynamic" });
    directory.focus();
    expect(directory.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("treeitem", { name: "traefik.yml" })).toBeNull();

    fireEvent.keyDown(directory, { key: "ArrowRight" });
    expect(directory.getAttribute("aria-expanded")).toBe("true");
    const file = screen.getByRole("treeitem", { name: "traefik.yml" });
    expect(file).toBeTruthy();

    fireEvent.keyDown(directory, { key: "ArrowDown" });
    expect(document.activeElement).toBe(file);

    fireEvent.keyDown(file, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(directory);
    fireEvent.keyDown(directory, { key: "ArrowLeft" });
    expect(directory.getAttribute("aria-expanded")).toBe("false");
  });
});

function DateRangeHarness({ onChange }: { onChange?: (value: DateRangeValue) => void }) {
  const [range, setRange] = useState<DateRangeValue>({
    start: "2026-07-03",
    end: "2026-07-06",
  });
  return (
    <>
      <DateRangePicker
        start={range.start}
        end={range.end}
        onChange={(next) => {
          setRange(next);
          onChange?.(next);
        }}
        presets={[{ label: "Last 7 days", start: "2026-07-01", end: "2026-07-08" }]}
      />
      <output data-testid="range-value">
        {range.start ?? "—"} / {range.end ?? "—"}
      </output>
    </>
  );
}

describe("DateRangePicker", () => {
  it("edits start/end dates through the controlled value", () => {
    const onChange = vi.fn();
    render(withAdapter(<DateRangeHarness onChange={onChange} />));

    const trigger = screen.getByTestId("date-range-picker");
    expect(trigger.textContent).toContain("2026");

    fireEvent.click(trigger);
    const startInput = screen.getByTestId("date-range-start") as HTMLInputElement;
    expect(startInput.value).toBe("2026-07-03");
    fireEvent.change(startInput, { target: { value: "2026-07-01" } });
    expect(onChange).toHaveBeenLastCalledWith({ start: "2026-07-01", end: "2026-07-06" });
    expect(screen.getByTestId("range-value").textContent).toBe("2026-07-01 / 2026-07-06");
    expect(trigger.textContent).not.toBe("Select date range");
  });

  it("applies a preset and clears the range", () => {
    render(withAdapter(<DateRangeHarness />));

    fireEvent.click(screen.getByTestId("date-range-picker"));
    fireEvent.click(screen.getByTestId("date-range-preset-0"));
    expect(screen.getByTestId("range-value").textContent).toBe("2026-07-01 / 2026-07-08");
    expect(screen.queryByTestId("date-range-start")).toBeNull();

    fireEvent.click(screen.getByTestId("date-range-picker"));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByTestId("range-value").textContent).toBe("— / —");
    expect(screen.getByTestId("date-range-picker").textContent).toBe("Select date range");
    expect(screen.queryByTestId("date-range-start")).toBeNull();
  });
});

const filterFields: FilterField[] = [
  { field: "name", label: "Name", kind: "exact" },
  {
    field: "createdAt",
    label: "Created",
    kind: "datetime",
    as: "range",
  },
  {
    field: "status",
    label: "Status",
    kind: "enum",
    options: [
      { value: "active", label: "Active" },
      { value: "paused", label: "Paused" },
    ],
  },
];

describe("FilterBar", () => {
  it("syncs the text draft when the controlled value changes", () => {
    const onChange = vi.fn();
    const result = render(
      withAdapter(
        <FilterBar
          fields={[]}
          value={[]}
          onChange={() => undefined}
          text={{ value: "abc", onChange }}
        />,
      ),
    );
    const search = screen.getByTestId("filter-search") as HTMLInputElement;
    expect(search.value).toBe("abc");
    fireEvent.change(search, { target: { value: "xyz" } });
    expect(onChange).toHaveBeenCalledWith("xyz");

    result.rerender(
      withAdapter(
        <FilterBar
          fields={[]}
          value={[]}
          onChange={() => undefined}
          text={{ value: "external", onChange }}
        />,
      ),
    );
    expect((screen.getByTestId("filter-search") as HTMLInputElement).value).toBe("external");
  });

  it("emits exact filter leaves without a local draft mirror", () => {
    const onChange = vi.fn();
    render(withAdapter(<FilterBar fields={filterFields} value={[]} onChange={onChange} />));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "foo" } });
    expect(onChange).toHaveBeenLastCalledWith([{ field: "name", op: "eq", value: "foo" }]);
  });

  it("renders datetime ranges through the adapter DateTimeInput", () => {
    const onChange = vi.fn();
    render(withAdapter(<FilterBar fields={filterFields} value={[]} onChange={onChange} />));
    const from = screen.getByLabelText("Created from") as HTMLInputElement;
    expect(from.className).toContain("test-datetime-input");
    fireEvent.change(from, { target: { value: "2026-01-01T10:00" } });
    expect(onChange).toHaveBeenLastCalledWith([
      { field: "createdAt", op: "gte", value: "2026-01-01T10:00" },
    ]);
  });

  it("selects enum values through the adapter popover and checkboxes", () => {
    const onChange = vi.fn();
    const result = render(
      withAdapter(<FilterBar fields={filterFields} value={[]} onChange={onChange} />),
    );
    fireEvent.click(screen.getByTestId("filter-enum-status"));
    fireEvent.click(screen.getByLabelText("Active"));
    expect(onChange).toHaveBeenLastCalledWith([{ field: "status", op: "in", value: ["active"] }]);

    const value: FilterValue[] = [{ field: "status", op: "in", value: ["active", "paused"] }];
    result.rerender(
      withAdapter(<FilterBar fields={filterFields} value={value} onChange={onChange} />),
    );
    expect((screen.getByLabelText("Active") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Paused") as HTMLInputElement).checked).toBe(true);
  });
});

describe("Pager", () => {
  it("renders offset paging and reports callbacks", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      withAdapter(
        <Pager
          paging={{ kind: "offset", total: 100, offset: 20, size: 20 }}
          onPrev={onPrev}
          onNext={onNext}
          onPageSizeChange={onPageSizeChange}
        />,
      ),
    );
    expect(screen.getByText("Showing 21–40 of 100")).toBeTruthy();
    expect(screen.getByText("Page 2 / 5")).toBeTruthy();

    const prev = screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement;
    const next = screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement;
    expect(prev.disabled).toBe(false);
    expect(next.disabled).toBe(false);
    fireEvent.click(prev);
    expect(onPrev).toHaveBeenCalled();
    fireEvent.click(next);
    expect(onNext).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Page size"), { target: { value: "50" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("disables prev on the first offset page and next on the last", () => {
    const result = render(
      withAdapter(
        <Pager
          paging={{ kind: "offset", total: 20, offset: 0, size: 20 }}
          onPrev={() => undefined}
          onNext={() => undefined}
        />,
      ),
    );
    expect(
      (screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    result.rerender(
      withAdapter(
        <Pager
          paging={{ kind: "offset", total: 0, offset: 0, size: 20 }}
          onPrev={() => undefined}
          onNext={() => undefined}
        />,
      ),
    );
    expect(screen.getByText("No rows")).toBeTruthy();
  });

  it("renders cursor paging from nextCursor and explicit canPrev", () => {
    const onNext = vi.fn();
    render(
      withAdapter(
        <Pager
          paging={{ kind: "cursor", nextCursor: "next", total: 42 }}
          onPrev={() => undefined}
          onNext={onNext}
          canPrev={false}
        />,
      ),
    );
    expect(screen.getByText("42 total")).toBeTruthy();
    const next = screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement;
    expect(next.disabled).toBe(false);
    fireEvent.click(next);
    expect(onNext).toHaveBeenCalled();
  });

  it("renders nothing for all-mode paging", () => {
    const result = render(
      withAdapter(
        <Pager
          paging={{ kind: "all", total: 42 }}
          onPrev={() => undefined}
          onNext={() => undefined}
        />,
      ),
    );
    expect(result.container.querySelector('[data-testid="pager"]')).toBeNull();
  });
});

describe("Tabs", () => {
  it("is controlled and reports value changes", () => {
    const onChange = vi.fn();
    const result = render(
      withAdapter(
        <Tabs
          items={[
            { value: "overview", label: "Overview" },
            { value: "events", label: "Events" },
          ]}
          value="overview"
          onChange={onChange}
        />,
      ),
    );
    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Events" }));
    expect(onChange).toHaveBeenCalledWith("events");

    result.rerender(
      withAdapter(
        <Tabs
          items={[
            { value: "overview", label: "Overview" },
            { value: "events", label: "Events" },
          ]}
          value="events"
          onChange={onChange}
        />,
      ),
    );
    expect(screen.getByRole("tab", { name: "Events" }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("AsyncState", () => {
  it("switches loading / empty / error / success without fetching", () => {
    const onRetry = vi.fn();
    const result = render(
      withAdapter(
        <AsyncState status="loading">
          <span>content</span>
        </AsyncState>,
      ),
    );
    expect(screen.getByTestId("loading-state")).toBeTruthy();

    result.rerender(
      withAdapter(
        <AsyncState status="empty" empty={{ title: "Nothing", description: "Adjust filters" }}>
          <span>content</span>
        </AsyncState>,
      ),
    );
    expect(screen.getByText("Nothing")).toBeTruthy();
    expect(screen.getByText("Adjust filters")).toBeTruthy();

    result.rerender(
      withAdapter(
        <AsyncState
          status="error"
          error={new ApiError("server", { message: "boom" })}
          onRetry={onRetry}
        >
          <span>content</span>
        </AsyncState>,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByTestId("error-state")).toBeTruthy();

    result.rerender(
      withAdapter(
        <AsyncState status="success">
          <span>content</span>
        </AsyncState>,
      ),
    );
    expect(screen.getByText("content")).toBeTruthy();
  });
});

describe("Form", () => {
  it("renders a submit shell with an error box and footer", () => {
    const onSubmit = vi.fn();
    render(
      withAdapter(
        <Form onSubmit={onSubmit} error="Invalid input">
          <input aria-label="Name" />
        </Form>,
      ),
    );
    fireEvent.submit(
      screen.getByRole("button", { name: "Save" }).closest("form") as HTMLFormElement,
    );
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.getByText("Invalid input")).toBeTruthy();
  });

  it("accepts a form handle instead of a direct callback", () => {
    const handleSubmit = vi.fn();
    render(
      withAdapter(
        <Form form={{ handleSubmit }} footer={<span>custom footer</span>}>
          <input aria-label="Name" />
        </Form>,
      ),
    );
    expect(screen.getByText("custom footer")).toBeTruthy();
    fireEvent.submit(screen.getByLabelText("Name").closest("form") as HTMLFormElement);
    expect(handleSubmit).toHaveBeenCalled();
  });
});

function AdapterInput(props: {
  "aria-label"?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
}) {
  const ui = useUiAdapter();
  return <ui.Input variant="bare" {...props} />;
}

describe("InputGroup", () => {
  it("renders the group frame, addons and a bare control", () => {
    render(
      withAdapter(
        <InputGroup startAddon={<span>https://</span>} endAddon={<span>copy</span>}>
          <AdapterInput aria-label="Host" />
        </InputGroup>,
      ),
    );
    const group = screen.getByRole("group");
    expect(group.className).toContain("ui-input-group");
    expect(screen.getByText("https://")).toBeTruthy();
    expect(screen.getByText("copy")).toBeTruthy();
    const input = screen.getByRole("textbox", { name: "Host" });
    expect(input.getAttribute("data-variant")).toBe("bare");
  });

  it("propagates disabled and invalid state", () => {
    render(
      withAdapter(
        <InputGroup disabled invalid>
          <AdapterInput aria-label="Secret" />
        </InputGroup>,
      ),
    );
    const group = screen.getByRole("group");
    expect(group.getAttribute("data-disabled")).toBe("true");
    expect(group.getAttribute("data-invalid")).toBe("true");
    const input = screen.getByRole("textbox", { name: "Secret" }) as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("SecretInput", () => {
  it("masks read-only values, reveals in place and copies the real value", () => {
    render(
      withAdapter(<SecretInput label="Password" value="s3cret" readOnly testId="password-field" />),
    );
    const input = screen.getByTestId("password-field") as HTMLInputElement;
    expect(input.value).toBe("••••••••••••");
    expect(input.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Reveal Password" }));
    expect(input.value).toBe("s3cret");
    expect(screen.getByRole("button", { name: "Copy Password" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Hide Password" }));
    expect(input.value).toBe("••••••••••••");
  });

  it("uses a password field for editable masked values and keeps the draft", () => {
    render(withAdapter(<SecretInputHarness />));
    const input = screen.getByLabelText("API key") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(input.value).toBe("draft");

    fireEvent.change(input, { target: { value: "next-draft" } });
    expect(input.value).toBe("next-draft");

    fireEvent.click(screen.getByRole("button", { name: "Reveal API key" }));
    expect(input.type).toBe("text");
    expect(input.value).toBe("next-draft");
  });
});
