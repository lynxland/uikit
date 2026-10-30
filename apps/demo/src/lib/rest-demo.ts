import type { FetchLike } from "@lynx-go/uikit-core/adapters";

// demo 的 REST 服务面（restFetchAll 的活文档）：真 URL 路由 + 信封 + 延迟。
// 消费方把它换成 authFetch（Bearer 头 + 401 全局闭环）即 fleetly 真实形态
// ——适配器不感知传输，fetch 注入点同形（SKILL.md 适配器作者节配方）。

export interface Task {
  id: string;
  title: string;
  priority: "low" | "high";
  done: boolean;
}

export interface Schedule {
  id: string;
  name: string;
  cadence: "hourly" | "daily" | "weekly";
}

const TASKS: Task[] = Array.from({ length: 23 }, (_, i) => ({
  id: `task-${String(i + 1).padStart(2, "0")}`,
  title: `Task ${String(i + 1).padStart(2, "0")}`,
  priority: i % 3 === 0 ? "high" : "low",
  done: i % 4 === 0,
}));

const CADENCES: Schedule["cadence"][] = ["hourly", "daily", "weekly"];
const SCHEDULES: Schedule[] = Array.from({ length: 17 }, (_, i) => ({
  id: `sched-${String(i + 1).padStart(2, "0")}`,
  name: `Schedule ${String(i + 1).padStart(2, "0")}`,
  cadence: CADENCES[i % 3]!,
}));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * REST over fetch 的 demo 服务（路径方言对照）：/v1/tasks 走默认信封 body.rows，
 * /v1/schedules 走 items 别名信封（envelope 选项覆写的消费形态）。
 */
export const demoRestFetch: FetchLike = async (url) => {
  await new Promise((r) => setTimeout(r, 90));
  if (url.startsWith("/v1/tasks")) return jsonResponse(200, { rows: TASKS });
  if (url.startsWith("/v1/schedules")) return jsonResponse(200, { schedules: SCHEDULES });
  return jsonResponse(404, { message: `no route for ${url}` });
};
