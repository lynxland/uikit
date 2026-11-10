# Record page template

详情页 = `PageLayout + RecordView + useRecord`。hero 可用 `h2`/`div`；
`PageLayout` 是唯一 `h1` 所有者。

```tsx
import { useRecord } from "@lynxland/uikit-react";
import {
  FieldGrid,
  PageLayout,
  RecordView,
  StatusBadge,
  type FieldView,
} from "@lynxland/uikit-surfaces";

const view: FieldView<Widget>[] = [
  { name: "name", kind: "text" },
  { name: "status", kind: "enum" },
  { name: "createdAt", kind: "datetime" },
];

export function WidgetDetailPage() {
  const record = useRecord(widget, id, { scope });
  const [tab, setTab] = useState("overview");

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: "Widgets", render: <Link to="/widgets">Widgets</Link> },
            { label: "Widget" },
          ]}
        />
      }
      description={`Widget ${id}`}
      width="wide"
    >
      <RecordView
        record={record}
        title={(row) => row.name}
        meta={(row) => <StatusBadge status={row.status} />}
        actions={(row) => <DeleteButton row={row} />}
        tabs={[
          {
            key: "overview",
            label: "Overview",
            render: (row) => <FieldGrid fields={view} row={row} />,
          },
          {
            key: "maintenance",
            label: "Maintenance",
            render: (row) => <MaintenancePanel row={row} />,
          },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      />
    </PageLayout>
  );
}
```

## URL tabs

preset `RecordPage` 在传 `from` 时默认把 tab 写成 URL（replace），
也允许受控 `activeTab`/`onTabChange` 覆盖：

```tsx
<RecordPage
  title={(row) => row.name}
  source={widget}
  id={id}
  fields={view}
  tabs={tabs}
  from="/widgets/$id"
/>
```

手装时：

```tsx
const search = useSearch({ from: "/widgets/$id", strict: false });
const navigate = useNavigate();
const tab = typeof search.tab === "string" ? search.tab : "overview";
const setTab = (next: string) =>
  navigate({ to: ".", search: (prev) => ({ ...prev, tab: next }), replace: true });
```

## 要点

- `useRecord(source, undefined)` = `status: "idle"`，不请求。
- `source.read` 返回 `null` = empty；404 由 adapter 选择 `notFound` 或 `ApiError`。
- tab 内容用 `render(row)` 懒渲染，不要提前创建 `content: ReactNode`。
- 详情页可以有 hero，但不要自己渲染 `h1`；页头归 `PageLayout`。

## 参考

- `packages/preset-console/src/pages/record-page.tsx`
- `packages/surfaces/src/views/record-view.tsx`
