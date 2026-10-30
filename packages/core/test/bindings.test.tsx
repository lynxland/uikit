// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { clientCollection, mockFetchAll } from "../src/adapters";
import type { ApiError } from "../src/kernel";
import { defineResource } from "../src/kernel";
import { useCollection, useCollectionData, useRecord } from "../src/react/bindings";
import { collectionQuerySchema } from "../src/schema";
import { renderWithKit } from "../src/testing";

// M1 读模型分层：useCollectionData（data 层，零 URL）× useCollection（URL 装配层）。
// fixtures：57 行 mock（demo 量级），clientCollection 整取方言。

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = Array.from({ length: 57 }, (_, i) => ({
  id: `row-${String(i + 1).padStart(2, "0")}`,
  name: `row-${String(i + 1).padStart(2, "0")}`,
}));

const fetchAll = mockFetchAll(ROWS, { latencyMs: 0 });
const rowsResource = defineResource({
  name: "rows",
  getId: (r: Row) => r.id,
  collection: clientCollection(fetchAll),
  record: (id: string) => {
    const row = fetchAll.rows().find((r) => r.id === id);
    if (!row) throw { kind: "not-found" } satisfies ApiError;
    return Promise.resolve(row);
  },
});

const rowsSearch = collectionQuerySchema({ text: ["name"], defaultSize: 10 });

afterEach(cleanup);

/** 伴读消费形态：直读 rows/status/total，无 URL 参与 */
function DataProbe(props: { window?: "all"; size?: number }) {
  const data = useCollectionData(rowsResource, {
    ...(props.window === "all" ? { window: "all" } : {}),
    ...(props.size !== undefined ? { size: props.size } : {}),
  });
  return (
    <div>
      <span data-testid="count">{data.rows.length}</span>
      <span data-testid="total">{data.total ?? "none"}</span>
      <span data-testid="status">{data.status}</span>
      <span data-testid="first">{data.rows[0]?.id ?? "none"}</span>
    </div>
  );
}

describe("useCollectionData（data 层：零 URL、rows 直出）", () => {
  it("缺省窗口 size=20 直出；total 附带（整取方言）", async () => {
    await renderWithKit(<DataProbe />, {});
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("20"));
    expect(screen.getByTestId("total").textContent).toBe("57");
    expect(screen.getByTestId("status").textContent).toBe("success");
    expect(screen.getByTestId("first").textContent).toBe("row-01");
  });

  it("window: 'all' = 全量行访问（clientCollection 整取方言的 fullRows 面）", async () => {
    await renderWithKit(<DataProbe window="all" />, {});
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("57"));
    expect(screen.getByTestId("total").textContent).toBe("57");
  });

  it("size 速记与谓词/排序 options 组装进同一查询键", async () => {
    function FilteredProbe() {
      const data = useCollectionData(rowsResource, {
        size: 5,
        predicate: { field: "name", op: "contains", value: "row-1" },
        order: [{ field: "name", dir: "asc" }],
      });
      return (
        <div>
          <span data-testid="count">{data.rows.length}</span>
          <span data-testid="first">{data.rows[0]?.id ?? "none"}</span>
        </div>
      );
    }
    await renderWithKit(<FilteredProbe />, {});
    // 谓词（contains "row-1" 命中 row-1 + row-10..19 共 11 行）× 窗口 size 5 × asc
    //（localeCompare 排序下 row-10 先于 row-1——断言锁 locale 实际行为）
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("5"));
    expect(screen.getByTestId("first").textContent).toBe("row-10");
  });

  it("enabled: false 保持 loading（不启用查询）", async () => {
    function DisabledProbe() {
      const data = useCollectionData(rowsResource, { size: 5, enabled: false });
      return <span data-testid="status">{data.status}</span>;
    }
    await renderWithKit(<DisabledProbe />, {});
    // 冲刷微任务后仍停 loading——enabled:false 未启用
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByTestId("status").textContent).toBe("loading");
  });
});

describe("useRecord options 扩齐（M1：refetchInterval/enabled/retry）", () => {
  it("enabled: false 停 loading，翻 true 后正常出数", async () => {
    function RecordProbe() {
      const [enabled, setEnabled] = useState(false);
      const record = useRecord(rowsResource, { id: "row-01", query: { enabled } });
      return (
        <>
          <span data-testid="record-status">{record.status}</span>
          <button type="button" onClick={() => setEnabled(true)}>
            enable
          </button>
        </>
      );
    }
    await renderWithKit(<RecordProbe />, {});
    // enabled:false —— 查询未启用，停 loading（无定时器驱动，确定性断言）
    expect(screen.getByTestId("record-status").textContent).toBe("loading");
    fireEvent.click(screen.getByRole("button", { name: "enable" }));
    await waitFor(() => expect(screen.getByTestId("record-status").textContent).toBe("success"));
  });

  it("isFetching 直通：初载与 refetch 刷新期为 true，落定回 false（按钮驱动——§12.11 教训）", async () => {
    // record 挂起由 pending 队列手动放行——零定时器赛跑
    const pending: Array<(row: Row) => void> = [];
    const gatedResource = defineResource({
      name: "record-fetching",
      getId: (r: Row) => r.id,
      record: (id: string) =>
        new Promise<Row>((resolve) => {
          pending.push((row) => resolve({ ...row, id }));
        }),
    });
    function FetchingProbe() {
      const record = useRecord(gatedResource, { id: "row-01" });
      return (
        <>
          <span data-testid="record-status">{record.status}</span>
          <span data-testid="record-fetching">{record.isFetching ? "true" : "false"}</span>
          <button type="button" onClick={() => record.refetch()}>
            refetch
          </button>
        </>
      );
    }
    await renderWithKit(<FetchingProbe />, {});
    // 初载挂起期：isFetching true（断言只读渲染态，不推进时钟）
    expect(screen.getByTestId("record-fetching").textContent).toBe("true");
    pending.shift()!({ id: "x", name: "row-01" });
    await waitFor(() => expect(screen.getByTestId("record-status").textContent).toBe("success"));
    expect(screen.getByTestId("record-fetching").textContent).toBe("false");

    // refetch 触发后台刷新（data 保留）：isFetching 翻 true，放行后回 false
    fireEvent.click(screen.getByRole("button", { name: "refetch" }));
    await waitFor(() => expect(screen.getByTestId("record-fetching").textContent).toBe("true"));
    expect(screen.getByTestId("record-status").textContent).toBe("success");
    pending.shift()!({ id: "x", name: "row-01" });
    await waitFor(() => expect(screen.getByTestId("record-fetching").textContent).toBe("false"));
  });
});

describe("useCollection（URL 绑定层 = data 层之上的装配，语义不变）", () => {
  it("search 解码进查询（q 过滤生效）、segment/total 照常暴露", async () => {
    function ListProbe() {
      const list = useCollection(rowsResource, { from: "/", search: rowsSearch });
      return (
        <div>
          <span data-testid="count">{list.rows.length}</span>
          <span data-testid="total">{list.total ?? "none"}</span>
          <span data-testid="status">{list.status}</span>
        </div>
      );
    }
    const r = await renderWithKit(<ListProbe />, {
      searchSchema: rowsSearch,
      search: { q: "row-1" },
    });
    await waitFor(() => expect(r.getSearch().q).toBe("row-1"));
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("10"));
    expect(screen.getByTestId("total").textContent).toBe("10");
    expect(screen.getByTestId("status").textContent).toBe("success");
  });
});
