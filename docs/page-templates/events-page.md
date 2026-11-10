# Events page template

事件/日志页 = backlog 定锚 + live stream 续订 + 帧视图。页面只组合，
不写协议、不内嵌业务实体名。

```tsx
import { ndjsonTransport, type StreamSource } from "@lynxland/uikit-core";
import { EventsPage } from "@lynxland/uikit-preset-console";

interface LogEvent {
  id: string;
  at: string;
  level: "info" | "warn" | "error";
  message: string;
  cursor?: string;
}

const logStream: StreamSource<LogEvent> = ndjsonTransport<LogEvent>({
  url: (cursor) =>
    cursor === null ? "/api/logs" : `/api/logs?cursor=${encodeURIComponent(cursor)}`,
});

export function LogsPage() {
  return (
    <EventsPage<LogEvent>
      title="Logs"
      description="Backlog anchors the stream; live frames follow."
      source={logBacklog}
      stream={logStream}
      getCursor={(frame) => frame.cursor}
      getKey={(frame) => frame.id}
      render={(frame) => (
        <div className="log-row">
          <RelativeTime value={frame.at} />
          <StatusBadge status={frame.level} />
          <span>{frame.message}</span>
        </div>
      )}
      labels={{ empty: "No log events yet." }}
    />
  );
}
```

## 设计

- **backlog** 用 `useCollection`（通常 `window.kind: "all"`，oldest → newest）。
- backlog 最后一帧的 cursor 作为 live 流的锚点；`null` 表示 live tail。
- 帧到达时视图自己订阅；页面级只读 stream 状态。
- 实时失效是组合，不是原语：

```tsx
useInvalidateOnFrame(stream, [invalidate("widgets")], {
  filter: (frame) => frame.type === "widget.updated",
  throttleMs: 250,
});
```

## 手装

```tsx
const backlog = useCollection(source, { window: { kind: "all" } });
const tail = backlog.rows.at(-1);
const anchor = tail !== undefined ? getCursor(tail) : undefined;
const stream = useStream(sourceOrFactory, {
  cursor: backlog.status === "success" ? (anchor ?? null) : undefined,
  getCursor,
});

return (
  <PageLayout title="Logs">
    <EventFeed stream={stream} backlog={backlog.rows} render={renderFrame} />
  </PageLayout>
);
```

## 日志视图

`LogViewer` 适合纯文本/可下载日志：follow/pause/clear/download 是视图内交互；
`EventFeed` 适合结构化事件；`StageTimeline` 适合阶段/部署进度。

## 参考

- `packages/preset-console/src/pages/events-page.tsx`
- `packages/surfaces/src/views/{log-viewer,event-feed,stage-timeline}.tsx`
