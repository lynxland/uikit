# CRUD page template

默认 CRUD 是 `CollectionPage + create/edit/delete 默认动作 + CrudFields`。
它只组合 command/dialog/表单，不内嵌业务规则。

```tsx
import { collectionSearch, type Command } from "@lynxland/uikit-core";
import { CrudPage, filterFieldsOf } from "@lynxland/uikit-preset-console";
import { crudFields, type FieldInput, type FieldView } from "@lynxland/uikit-surfaces";

interface Widget {
  id: string;
  name: string;
  status: "running" | "stopped";
  replicas: number;
}

interface CreateWidget {
  name: string;
  status: "running" | "stopped";
  replicas: number;
}

interface UpdateWidget extends CreateWidget {
  id: string;
}

const view: FieldView<Widget>[] = [
  { name: "name", kind: "text", list: { sortable: true } },
  { name: "status", kind: "enum", options: [
    { value: "running", label: "Running" },
    { value: "stopped", label: "Stopped" },
  ], list: { filter: "enum" } },
  { name: "replicas", kind: "number" },
];

const create: FieldInput<CreateWidget>[] = [
  { name: "name", kind: "text", required: true },
  { name: "status", kind: "enum", options: [...] },
  { name: "replicas", kind: "number" },
];

const update: FieldInput<UpdateWidget>[] = [
  { name: "id", kind: "text", required: true },
  ...create,
];

const fields = crudFields<Widget, CreateWidget, UpdateWidget>({
  view,
  create,
  update,
  createDefaults: { status: "running", replicas: 1 },
  toUpdateInput: (row) => ({ id: row.id, name: row.name, status: row.status, replicas: row.replicas }),
});

const widgetsSearch = collectionSearch({
  text: ["name"],
  filters: [{ field: "status", op: "eq" }],
  defaultSize: 20,
  defaultPage: { kind: "offset", offset: 0 },
});

export function WidgetsCrudPage() {
  return (
    <CrudPage<Widget, CreateWidget, UpdateWidget, string>
      title="Widgets"
      source={widgets}
      search={widgetsSearch}
      from="/widgets"
      fields={fields}
      filters={filterFieldsOf(view)}
      create={{ command: createWidget, host: "dialog", title: "New widget" }}
      update={{
        command: updateWidget,
        host: "drawer",
        title: "Edit widget",
        toInput: (row) => ({ id: row.id, name: row.name, status: row.status, replicas: row.replicas }),
      }}
      delete={{ command: deleteWidget, title: "Delete widget" }}
      getRowId={(row) => row.id}
    />
  );
}
```

## 命令形状

```ts
const createWidget: Command<CreateWidget, Widget> = {
  run: async (input, ctx) => ok(api.createWidget(input, ctx.projectId)),
  effects: [invalidate("widgets")],
};

const updateWidget: Command<UpdateWidget, Widget> = {
  run: async (input, ctx) => ok(api.updateWidget(input, ctx.projectId)),
  effects: [invalidate("widgets", { kind: "record", id: input.id })],
};

const deleteWidget: Command<string, unknown> = {
  run: async (id, ctx) => {
    await api.deleteWidget(id, ctx.projectId);
    return ok(undefined);
  },
  effects: [invalidate("widgets")],
};
```

- `Command.run` 必须是函数属性，不能写方法签名。
- create/update/delete 的 Input 类型独立；`toInput` 显式做 Row → Input。
- 默认 delete input 是 `getRowId(row)`；需要别的东西就传 `toInput`。
- `effects: []` 表示不失效；否则 ok 后按 Effect 失效。
- 三种 host：`dialog` / `drawer` 内置；`page` 用 `onPageHost` 导航到
  `FormPage` 路由（URL 拥有模式，刷新/深链可恢复）。

## 退出路径

- 不要 `CrudPage`：用 `CollectionPage` + 自己的命令按钮。
- 不要 `CollectionPage`：用 `PageLayout + CollectionView + useCollectionPage`。
- 不要 `CollectionView`：用 `DataTable/FilterBar/Pager` + `useCollection`。
- 不要 preset 字段：用 `FieldView`/`FieldInput`/`FilterField` 手写，或完全自定义表单。

## 参考

- `packages/preset-console/src/pages/crud-page.tsx`
- `packages/surfaces/src/fields/types.ts`
