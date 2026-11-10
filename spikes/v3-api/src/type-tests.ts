import type { ReactNode } from "react";
import {
  type CrudPageProps,
  type FieldInput,
  type FieldView,
  crudFields,
} from "./crud-types.js";
import {
  type Command,
  collectionSource,
} from "./source-identity.js";
import { collectionSearch } from "./url-serializer.js";

interface Widget {
  id: string;
  name: string;
  status: "running" | "stopped";
  replicas: number;
  createdAt: string;
}

interface CreateWidget {
  name: string;
  status: "running" | "stopped";
  replicas: number;
}

interface UpdateWidget {
  id: string;
  name: string;
  status: "running" | "stopped";
  replicas: number;
}

const fields = crudFields<Widget, CreateWidget, UpdateWidget>({
  view: [
    { name: "id", kind: "text" },
    { name: "name", kind: "text" },
    { name: "status", kind: "enum", options: [{ value: "running", label: "Running" }] },
    { name: "replicas", kind: "number" },
    { name: "createdAt", kind: "datetime" },
  ],
  create: [
    { name: "name", kind: "text", required: true },
    { name: "status", kind: "enum", options: [{ value: "running", label: "Running" }] },
    { name: "replicas", kind: "number" },
  ],
  update: [
    { name: "id", kind: "text" },
    { name: "name", kind: "text", required: true },
    { name: "status", kind: "enum", options: [{ value: "running", label: "Running" }] },
    { name: "replicas", kind: "number" },
  ],
  createDefaults: { name: "", status: "running", replicas: 1 },
  toUpdateInput: (row) => ({ id: row.id, name: row.name, status: row.status, replicas: row.replicas }),
});

// Compile-time checks: field names are keyed by the correct type.
const goodCreateField: FieldInput<CreateWidget> = { name: "name", kind: "text" };
const goodViewField: FieldView<Widget> = { name: "createdAt", kind: "datetime" };

// @ts-expect-error id is not a create input field
const badCreateField: FieldInput<CreateWidget> = { name: "id", kind: "text" };

// @ts-expect-error createdAt is not in Widget view? it is; use a missing field
const badViewField: FieldView<Widget> = { name: "missing", kind: "text" };

// @ts-expect-error createdAt is not in CreateWidget
const badCreateDefaults: Partial<CreateWidget> = { createdAt: "2026-01-01" };

// @ts-expect-error update fields cannot use a field absent from UpdateWidget
const badUpdateField: FieldInput<UpdateWidget> = { name: "createdAt", kind: "datetime" };

const source = collectionSource<Widget>({
  name: "widgets",
  scope: ["projectId"],
  read: async () => ({
    rows: [],
    paging: { kind: "offset", total: 0, offset: 0, size: 20 },
  }),
});

const search = collectionSearch({ text: ["name", "id"], defaultSize: 20 });

const createCommand: Command<CreateWidget, Widget> = {
  run: async (input) => ({
    id: "w1",
    name: input.name,
    status: input.status,
    replicas: input.replicas,
    createdAt: "2026-01-01",
  }),
};

const updateCommand: Command<UpdateWidget, Widget> = {
  run: async (input) => ({
    id: input.id,
    name: input.name,
    status: input.status,
    replicas: input.replicas,
    createdAt: "2026-01-01",
  }),
};

const deleteCommand: Command<string, unknown> = {
  run: async () => undefined,
};

const page: CrudPageProps<Widget, CreateWidget, UpdateWidget, string> = {
  source,
  search,
  from: "/widgets",
  columns: [{ header: "Name", accessor: (row) => row.name }],
  fields,
  create: { command: createCommand, host: "dialog" },
  update: { command: updateCommand, host: "drawer", toInput: (row) => ({ id: row.id, name: row.name }) },
  delete: { command: deleteCommand, toInput: (row) => row.id },
  getRowId: (row) => row.id,
  empty: null,
};

// @ts-expect-error a command requiring UpdateWidget cannot be used as CreateWidget command
const badCreateCommand: Command<CreateWidget, Widget> = updateCommand;

const badPage: CrudPageProps<Widget, CreateWidget, UpdateWidget> = {
  ...page,
  // @ts-expect-error CrudPage create command must accept CreateWidget
  create: { command: updateCommand },
};

const node: ReactNode = fields.view[0]?.list?.render?.({
  id: "w1",
  name: "widget",
  status: "running",
  replicas: 1,
  createdAt: "2026-01-01",
});

void goodCreateField;
void goodViewField;
void badCreateField;
void badViewField;
void badCreateDefaults;
void badUpdateField;
void badCreateCommand;
void badPage;
void node;
