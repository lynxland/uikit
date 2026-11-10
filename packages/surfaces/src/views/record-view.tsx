import type { ApiError } from "@lynxland/uikit-core";
import type { RecordHandle } from "@lynxland/uikit-react";
import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { AsyncState, type AsyncStateProps, type AsyncStatus, Tabs } from "../controls";
import { FieldGrid, type FieldView } from "../fields";
import { cx } from "../values/classes";

/**
 * Record detail view (design.md §6.2). The hero may use `h2`/`div`; `h1` is
 * owned by chrome only. Tab content is rendered lazily from `render(row)`.
 */

export interface RecordViewTab<T> {
  key: string;
  label: ReactNode;
  render: (row: T) => ReactNode;
}

export interface RecordViewProps<T> {
  record: RecordHandle<T>;
  title?: (row: T) => ReactNode;
  meta?: (row: T) => ReactNode;
  actions?: (row: T) => ReactNode;
  fields?: readonly FieldView<T>[];
  tabs?: readonly RecordViewTab<T>[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  empty?: AsyncStateProps["empty"];
  describeError?: (error: ApiError) => string;
  errorTitle?: string;
  className?: string;
}

function asyncStatus(status: RecordHandle<unknown>["status"]): AsyncStatus {
  return status === "idle" ? "loading" : status;
}

const NOOP = () => {};

export function RecordView<T>({
  record,
  title,
  meta,
  actions,
  fields,
  tabs,
  activeTab,
  onTabChange,
  empty,
  describeError,
  errorTitle,
  className,
}: RecordViewProps<T>) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const status = asyncStatus(record.status);
  const hasTabs = tabs !== undefined && tabs.length > 0;
  const active = tabs?.find((tab) => tab.key === activeTab) ?? tabs?.[0];
  const row = record.data;

  return (
    <div className={merge("ui-record-view", className)} data-testid="record-view">
      <AsyncState
        status={status}
        error={record.error}
        onRetry={record.refetch}
        empty={empty ?? { title: "Not found" }}
        {...(describeError !== undefined ? { describeError } : {})}
        {...(errorTitle !== undefined ? { errorTitle } : {})}
      >
        {row !== undefined ? (
          <div className="ui-record-view__content">
            {title !== undefined || meta !== undefined || actions !== undefined ? (
              <header className="ui-record-view__hero" data-testid="record-hero">
                <div className="ui-record-view__heading">
                  {title !== undefined ? (
                    <h2 className="ui-record-view__title">{title(row)}</h2>
                  ) : null}
                  {meta !== undefined ? (
                    <div className="ui-record-view__meta">{meta(row)}</div>
                  ) : null}
                </div>
                {actions !== undefined ? (
                  <div className="ui-record-view__actions">{actions(row)}</div>
                ) : null}
              </header>
            ) : null}
            {hasTabs ? (
              <>
                <Tabs
                  className="ui-record-view__tabs"
                  items={tabs.map((tab) => ({ value: tab.key, label: tab.label }))}
                  value={active?.key ?? ""}
                  onChange={onTabChange ?? NOOP}
                  variant="underline"
                  aria-label="Sections"
                />
                <div className="ui-record-view__tabpanel" data-testid="record-tabpanel">
                  {active?.render(row)}
                </div>
              </>
            ) : fields !== undefined ? (
              <FieldGrid fields={fields} row={row} />
            ) : null}
          </div>
        ) : null}
      </AsyncState>
    </div>
  );
}
