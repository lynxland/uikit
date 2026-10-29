import { DataTable } from "@blocks/query/data-table";
import { FilterBar } from "@blocks/query/filter-bar";
import { Pagination } from "@blocks/query/pagination";
import { Page } from "@blocks/shell/page";
import { StatCard } from "@blocks/values/stat-card";
import { StatusBadge } from "@blocks/values/status-badge";
import { useCollection, useCollectionData } from "@lynx-go/uikit-core";
import { createFileRoute } from "@tanstack/react-router";
import {
  schedulesResource,
  schedulesSearch,
  tasksFetchAll,
  tasksResource,
  tasksSearch,
} from "@/lib/resources";

// 多集合同路由（M1 namespace + M3 无损编解码）：
// - 两个 collectionQuerySchema 各带 namespace（tasks/schedules）——URL 键
//   tasks.q 与 schedules.q 并存互不携带，tab/列表过滤互不污染；
// - 路由 validateSearch 组合两个 schema 的 validate（passthrough 下零手写合并器：
//   各归一本命名空间键、透传其余键）；
// - 顶部统计条是 useCollectionData 伴读消费点（data 层）：零 URL、全量行
//   （window:"all"）——列表页的 q/page 不影响它，也不需要为读它再绑一路由。

const validateBoth = (input: unknown) => ({
  ...tasksSearch.toSearchSchema()["~standard"].validate(input).value,
  ...schedulesSearch.toSearchSchema()["~standard"].validate(input).value,
});

export const Route = createFileRoute("/collections")({
  validateSearch: validateBoth,
  component: CollectionsPage,
});

function TaskStats() {
  // 伴读消费（fleetly backups 统计退场的机制形态）：整取方言全量行直读
  const tasks = useCollectionData(tasksResource, { window: "all" });
  const rows = tasks.rows;
  const open = rows.filter((t) => !t.done).length;
  return (
    <div className="grid grid-cols-3 gap-3" data-testid="tasks-stats">
      <StatCard label="Tasks (all)" value={tasks.status === "loading" ? "…" : rows.length} />
      <StatCard label="Open" value={tasks.status === "loading" ? "…" : open} tone="warn" />
      <StatCard
        label="High priority"
        value={tasks.status === "loading" ? "…" : rows.filter((t) => t.priority === "high").length}
        tone="err"
      />
    </div>
  );
}

function CollectionsPage() {
  const tasks = useCollection(tasksResource, { from: Route.id, search: tasksSearch });
  const schedules = useCollection(schedulesResource, {
    from: Route.id,
    search: schedulesSearch,
  });

  return (
    <Page
      title="Two collections, one route"
      description="Namespaced URL keys — tasks.q and schedules.q coexist without carrying each other. Stats strip reads full rows via useCollectionData (zero URL)."
    >
      <TaskStats />

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-line bg-panel" data-testid="tasks-panel">
          <h2 className="px-3 pt-3 pb-1 text-sm font-medium">Tasks</h2>
          <FilterBar
            list={tasks}
            schema={tasksSearch}
            textPlaceholder="Search tasks… (tasks.q)"
          />
          <DataTable
            list={tasks}
            getRowId={(row) => row.id}
            columns={[
              { accessorKey: "id", header: "ID" },
              { accessorKey: "title", header: "Title" },
              { accessorKey: "priority", header: "Priority" },
              {
                accessorKey: "done",
                header: "State",
                cell: (info) =>
                  info.getValue() ? (
                    <StatusBadge status="done" />
                  ) : (
                    <StatusBadge status="running" />
                  ),
              },
            ]}
          />
          <Pagination list={tasks} />
        </section>

        <section className="rounded-lg border border-line bg-panel" data-testid="schedules-panel">
          <h2 className="px-3 pt-3 pb-1 text-sm font-medium">Schedules</h2>
          <FilterBar
            list={schedules}
            schema={schedulesSearch}
            textPlaceholder="Search schedules… (schedules.q)"
          />
          <DataTable
            list={schedules}
            getRowId={(row) => row.id}
            columns={[
              { accessorKey: "id", header: "ID" },
              { accessorKey: "name", header: "Name" },
              { accessorKey: "cadence", header: "Cadence" },
            ]}
          />
          <Pagination list={schedules} />
        </section>
      </div>

      <p className="mt-3 text-xs text-muted">
        Dogfood note: type in one search box and watch the other list's URL keys stay untouched —
        the stats strip never re-queries on list filtering (separate query key, no URL binding).
      </p>
    </Page>
  );
}
