import { expect, test } from "@playwright/test";

// M1/M3 验收：多集合同路由的 namespace 键隔离 + 刷新还原 + 伴读统计（useCollectionData）。

test.describe("two collections, one route (namespace keys)", () => {
  test("each list owns its URL keys — filtering tasks never touches schedules", async ({
    page,
  }) => {
    await page.goto("/collections");
    await expect(
      page.getByTestId("tasks-panel").getByRole("cell", { name: "task-01" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByTestId("schedules-panel").getByRole("cell", { name: "sched-01" }),
    ).toBeVisible();

    // 初始：无任何 q 键
    await expect(page).not.toHaveURL(/q/);

    // tasks 搜索 → 只有 tasks.q 进 URL，schedules 键不被携带
    const tasksSearch = page.getByTestId("tasks-panel").getByLabel("Search");
    await tasksSearch.fill("task-1");
    await tasksSearch.press("Enter");
    await expect(page).toHaveURL(/tasks\.q=task-1/);
    await expect(page).not.toHaveURL(/schedules\.q=/);

    // schedules 搜索 → 两键并存、各持各值
    const schedulesSearch = page.getByTestId("schedules-panel").getByLabel("Search");
    await schedulesSearch.fill("sched-1");
    await schedulesSearch.press("Enter");
    await expect(page).toHaveURL(/tasks\.q=task-1/);
    await expect(page).toHaveURL(/schedules\.q=sched-1/);

    // 过滤生效：tasks 面板只剩 task-1x，schedules 面板只剩 sched-2x
    await expect(
      page.getByTestId("tasks-panel").getByRole("cell", { name: "task-05", exact: true }),
    ).toBeHidden();
    await expect(
      page.getByTestId("tasks-panel").getByRole("cell", { name: "task-10", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByTestId("schedules-panel").getByRole("cell", { name: "sched-02", exact: true }),
    ).toBeHidden();
    await expect(
      page.getByTestId("schedules-panel").getByRole("cell", { name: "sched-10", exact: true }),
    ).toBeVisible();
  });

  test("deep link restores both lists from namespaced keys", async ({ page }) => {
    await page.goto("/collections?tasks.q=task-2&schedules.q=sched-1");
    await expect(
      page.getByTestId("tasks-panel").getByRole("cell", { name: "task-21", exact: true }),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByTestId("tasks-panel").getByRole("cell", { name: "task-01", exact: true }),
    ).toBeHidden();
    await expect(
      page.getByTestId("schedules-panel").getByRole("cell", { name: "sched-10", exact: true }),
    ).toBeVisible();

    // 搜索框初值来自各命名空间键（FilterBar 经谓词回读）
    await expect(page.getByTestId("tasks-panel").getByLabel("Search")).toHaveValue("task-2");
    await expect(page.getByTestId("schedules-panel").getByLabel("Search")).toHaveValue("sched-1");
  });

  test("stats strip reads full rows via useCollectionData (unaffected by list filtering)", async ({
    page,
  }) => {
    await page.goto("/collections");
    // 整取方言全量行：23 行（fixture），与窗口 size 5 无关
    await expect(page.getByTestId("tasks-stats")).toContainText("23", { timeout: 10_000 });

    const tasksSearch = page.getByTestId("tasks-panel").getByLabel("Search");
    await tasksSearch.fill("task-1");
    await tasksSearch.press("Enter");
    await expect(page).toHaveURL(/tasks\.q=task-1/);
    // 列表窗口已过滤（task-1x 共 11 行 → 首页 5 行），统计条仍读全量 23
    await expect(page.getByTestId("tasks-panel").getByRole("row")).toHaveCount(6); // header + 5
    await expect(page.getByTestId("tasks-stats")).toContainText("23");
  });
});
