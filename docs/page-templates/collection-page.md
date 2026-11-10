# Collection page template

手装 `PageLayout + CollectionView + useCollectionPage`，不经过 preset 页面。

```tsx
import { collectionSearch } from "@lynxland/uikit-core";
import { useCollectionPage } from "@lynxland/uikit-react/router";
import {
  CollectionView,
  type Column,
  type FieldView,
  type FilterField,
  PageLayout,
} from "@lynxland/uikit-surfaces";

const widgetsSearch = collectionSearch({
  text: ["name", "id"],
  filters: [{ field: "status", op: "eq" }],
  defaultSize: 20,
  defaultPage: { kind: "offset", offset: 0 }, // offset 分页必须声明
  namespace: "widgets",
});

const columns: Column<Widget>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name, sortField: "name" },
  { id: "status", header: "Status", accessor: (row) => row.status, sortField: "status" },
  { id: "replicas", header: "Replicas", accessor: (row) => row.replicas, align: "end" },
];

const filters: FilterField[] = [
  { field: "status", kind: "enum", options: [
    { value: "running", label: "Running" },
    { value: "stopped", label: "Stopped" },
  ] },
];

export function WidgetsPage() {
  const page = useCollectionPage(widgets, { search: widgetsSearch, from: "/widgets" });

  return (
    <PageLayout title="Widgets" description="All widgets in this project" width="wide">
      <CollectionView
        list={page}
        columns={columns}
        filters={filters}
        filterState={{ text: page.state.q ?? "", filters: page.state.filters ?? [] }}
        onFilterChange={({ text, filters }) =>
          page.patchState({ q: text || undefined, filters })
        }
        sort={page.state.sort}
        onSortChange={(sort) => page.setSort(sort.length > 0 ? sort : null)}
        pagerModel={page.pager}
        onRowClick={(row) => navigate({ to: "/widgets/$id", params: { id: row.id } })}
      />
    </PageLayout>
  );
}
```

## 要点

- `filterState` + `onFilterChange` 是受控的；状态归 URL，不归控件。
- `onSortChange` 的 `[]` 表示清空排序；preset 会转成 `null`。
- `CollectionView` 不渲染 h1；唯一 h1 在 `PageLayout`。
- 分页：`pagerModel={page.pager}`；offset/cursor/all 由 `CollectionView` 自动渲染。
- 需要列可见性/行选择时，直接用 `DataTable` 组合，或给 `CollectionView` 传 `toolbar`/`tabs`。
- 退出 preset：把 `useCollectionPage` 换成 `useCollection` + 自己的 URL codec；
  数据层不变。

## 路由接线

```tsx
export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/widgets",
  validateSearch: widgetsSearch.schema,
  component: WidgetsPage,
});
```

Router 的 `parseSearch` / `stringifySearch` 挂 `widgetsSearch.serializer`；
未知 search 键会原样保留。

## 参考

- `packages/preset-console/src/pages/collection-page.tsx`
- `packages/surfaces/src/views/collection-view.tsx`
