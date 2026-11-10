# Form page template

表单页 = `PageLayout + FormView + useCommandForm`。`FormView` 消费表单句柄，
不创建表单，也不拥有 dialog/drawer。

```tsx
import { ok, type Command } from "@lynxland/uikit-core";
import { useCommandForm } from "@lynxland/uikit-react";
import {
  FormView,
  PageLayout,
  type FieldInput,
} from "@lynxland/uikit-surfaces";

interface CreateWidget {
  name: string;
  status: "running" | "stopped";
  replicas: number;
}

const fields: FieldInput<CreateWidget>[] = [
  { name: "name", kind: "text", required: true },
  { name: "status", kind: "enum", options: [
    { value: "running", label: "Running" },
    { value: "stopped", label: "Stopped" },
  ] },
  { name: "replicas", kind: "number" },
];

const createWidget: Command<CreateWidget, Widget> = {
  run: async (input, ctx) => ok(api.createWidget(input, ctx.projectId)),
  effects: [invalidate("widgets")],
};

export function NewWidgetPage() {
  const form = useCommandForm(
    createWidget,
    { fields, defaultValues: { status: "running", replicas: 1 } },
    {
      scope,
      onSettled: (result) => {
        if (result?.status === "ok") navigate({ to: "/widgets/$id", params: { id: result.payload.id } });
      },
    },
  );

  return (
    <PageLayout
      title="New widget"
      backLink={<Link to="/widgets">Back</Link>}
      width="narrow"
    >
      <FormView form={form} fields={fields} submitLabel="Create" />
    </PageLayout>
  );
}
```

## 校验

```ts
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  replicas: z.number().int().min(1),
});

const form = useCommandForm(createWidget, { schema, fields }, options);
```

- 任意 Standard Schema（Zod / Valibot / Effect Schema）都可。
- `required` 只是快捷校验；复杂规则走 schema。
- `rejected` → 表单级/字段级错误；`conflict` → 表单级消息；`ok` → `reveal` 一次性值。
- `ApiError` 走失败通道，`form.failure` 可渲染服务端错误。

## Dialog / Drawer 组合

`FormView` 不弹窗。页面模板自己组合：

```tsx
<ui.Dialog open={open} onOpenChange={setOpen} title="New widget">
  <FormView form={form} fields={fields} submitLabel="Create" cancel={() => setOpen(false)} />
</ui.Dialog>
```

`ui` 来自 `useUiAdapter()`；默认 `ui-shadcn` 的 Dialog/Drawer 已封装焦点/键盘/portal。

## 退出路径

- 不要 `FormPage`：`useCommandForm` + `FormView` 手装。
- 不要 `FormView`：`Form` 壳 + `FieldInputs` 手装。
- 不要字段基座：自定义表单，只保留 `Command`/`Outcome` 契约。

## 参考

- `packages/preset-console/src/pages/form-page.tsx`
- `packages/surfaces/src/views/form-view.tsx`
