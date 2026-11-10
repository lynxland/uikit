import type {
  CollectionRequest,
  CollectionSource,
  Cursor,
  Scope,
  StreamSource,
  StreamStatus,
} from "@lynxland/uikit-core";
import type { CollectionQueryOptions, UseStreamOptions } from "@lynxland/uikit-react";
import { useCollection, useStream } from "@lynxland/uikit-react";
import { EventFeed, PageLayout, type PageLayoutProps } from "@lynxland/uikit-surfaces";
import type { ReactNode } from "react";

/**
 * Events page (design.md §6.4): the backlog collection anchors the cursor and
 * the stream extends it; `EventFeed` owns presentation and frame interaction.
 *
 * The page only composes bindings — it never speaks a protocol. Backlog rows
 * are assumed to be ordered oldest → newest.
 */
export interface EventsPageLabels {
  /** EventFeed title (inside the card). */
  feed?: ReactNode;
  empty?: ReactNode;
  status?: Partial<Record<StreamStatus, string>>;
}

export interface EventsPageProps<Frame> {
  title?: ReactNode;
  description?: ReactNode;
  /** Backlog collection (oldest → newest). */
  source: CollectionSource<Frame>;
  /** Defaults to `{ window: { kind: "all" } }`. */
  request?: CollectionRequest;
  stream: StreamSource<Frame>;
  /** Frame → resume cursor. The backlog tail anchors the live stream. */
  getCursor: (frame: Frame) => Cursor | undefined;
  getKey?: (frame: Frame) => string | number;
  render?: (frame: Frame) => ReactNode;
  limit?: number;
  /** Explicit anchor override (`null` = live tail, `undefined` = derive). */
  cursor?: Cursor | null;
  scope?: Scope;
  query?: CollectionQueryOptions;
  streamOptions?: Omit<UseStreamOptions<Frame>, "cursor" | "getCursor" | "autoStart">;
  labels?: EventsPageLabels;
  width?: PageLayoutProps["width"];
  breadcrumb?: ReactNode;
  className?: string;
}

const ALL_ROWS: CollectionRequest = { window: { kind: "all" } };

export function EventsPage<Frame>({
  title,
  description,
  source,
  request,
  stream,
  getCursor,
  getKey,
  render,
  limit,
  cursor,
  scope,
  query,
  streamOptions,
  labels,
  width,
  breadcrumb,
  className,
}: EventsPageProps<Frame>) {
  const backlog = useCollection(source, request ?? ALL_ROWS, {
    ...(query ?? {}),
    ...(scope !== undefined ? { scope } : {}),
  });

  const last = backlog.rows[backlog.rows.length - 1];
  const anchor = last !== undefined ? getCursor(last) : undefined;
  const backlogSettled =
    backlog.status === "success" || backlog.status === "empty" || backlog.status === "error";
  const liveCursor =
    cursor !== undefined
      ? cursor
      : anchor !== undefined
        ? anchor
        : backlogSettled
          ? null
          : undefined;

  const binding = useStream(stream, {
    ...streamOptions,
    cursor: liveCursor,
    getCursor,
  });

  return (
    <PageLayout
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      width={width ?? "wide"}
      {...(breadcrumb !== undefined ? { breadcrumb } : {})}
      {...(className !== undefined ? { className } : {})}
    >
      <EventFeed<Frame>
        stream={binding}
        backlog={backlog.rows}
        {...(getKey !== undefined ? { getKey } : {})}
        {...(render !== undefined ? { render } : {})}
        {...(limit !== undefined ? { limit } : {})}
        {...(labels?.feed !== undefined ? { title: labels.feed } : {})}
        {...(labels?.empty !== undefined ? { emptyText: labels.empty } : {})}
        {...(labels?.status !== undefined ? { statusLabels: labels.status } : {})}
      />
    </PageLayout>
  );
}
