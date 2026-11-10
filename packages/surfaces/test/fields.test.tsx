import { lookupSource } from "@lynxland/uikit-core";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import {
  type CrudFields,
  crudFields,
  FieldGrid,
  type FieldInput,
  type FieldReference,
  type FieldView,
} from "../src/fields";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

function withAdapter(node: ReactNode) {
  return <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>;
}

interface Row {
  id: string;
  name: string;
  status: "active" | "paused";
  notes: string;
}

interface CreateInput {
  name: string;
  secret: string;
}

interface UpdateInput {
  name?: string;
}

describe("crudFields", () => {
  it("keeps create/update input types independent", () => {
    const fields = crudFields<Row, CreateInput, UpdateInput>({
      view: [
        { name: "name", kind: "text" },
        { name: "status", kind: "enum", options: [{ value: "active", label: "Active" }] },
      ],
      create: [
        { name: "name", kind: "text", required: true },
        { name: "secret", kind: "text" },
      ],
      update: [{ name: "name", kind: "text" }],
      createDefaults: { name: "New widget" },
      toUpdateInput: (row) => ({ name: row.name }),
    });

    expect(fields.view).toHaveLength(2);
    expect(fields.create.map((field) => field.name)).toEqual(["name", "secret"]);
    expect(fields.update.map((field) => field.name)).toEqual(["name"]);
    expect(fields.createDefaults).toEqual({ name: "New widget" });
    expect(fields.toUpdateInput?.(rowFixture)).toEqual({ name: "Widget" });

    expectTypeOf(fields).toEqualTypeOf<CrudFields<Row, CreateInput, UpdateInput>>();
    expectTypeOf(fields.create).toEqualTypeOf<readonly FieldInput<CreateInput>[]>();
    expectTypeOf(fields.update).toEqualTypeOf<readonly FieldInput<UpdateInput>[]>();
  });
});

const rowFixture: Row = {
  id: "1",
  name: "Widget",
  status: "active",
  notes: "first line",
};

const viewFields: FieldView<Row>[] = [
  { name: "name", kind: "text", label: "Name", detail: { section: "Identity" } },
  {
    name: "status",
    kind: "enum",
    options: [
      { value: "active", label: "Active" },
      { value: "paused", label: "Paused" },
    ],
    detail: { section: "Identity" },
  },
  {
    name: "notes",
    kind: "text",
    detail: { section: "Meta", monospace: true, render: (row) => <em>{row.notes}</em> },
  },
];

describe("FieldReference", () => {
  it("accepts a concrete LookupSource and row-typed accessors", () => {
    interface Owner {
      id: string;
      name: string;
    }
    const owners = lookupSource<Owner, string>({
      name: "owners",
      read: async () => [],
    });
    const reference: FieldReference = {
      source: owners,
      getLabel: (row: Owner) => row.name,
      getValue: (row: Owner) => row.id,
    };
    expect(reference).toBeTruthy();
    expectTypeOf(reference).toEqualTypeOf<FieldReference>();
  });
});

describe("FieldGrid", () => {
  it("groups sections, renders labels and honours detail.render", () => {
    render(withAdapter(<FieldGrid fields={viewFields} row={rowFixture} columns={3} />));
    expect(screen.getByTestId("field-grid").className).toContain("ui-field-grid--cols-3");
    expect(screen.getByText("Identity")).toBeTruthy();
    expect(screen.getByText("Meta")).toBeTruthy();
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Widget")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("first line").tagName).toBe("EM");
  });

  it("falls back to a humanized field name and empty marker", () => {
    render(
      withAdapter(
        <FieldGrid
          fields={[{ name: "createdAt" as keyof Row & string, kind: "text", label: undefined }]}
          row={{ createdAt: "" } as unknown as Row}
        />,
      ),
    );
    expect(screen.getByText("Created At")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("renders the empty slot when there are no fields", () => {
    render(withAdapter(<FieldGrid fields={[]} row={rowFixture} empty="No fields" />));
    expect(screen.getByText("No fields")).toBeTruthy();
  });
});
