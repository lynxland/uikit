import type { RecordSource, Scope } from "@lynxland/uikit-core";
import type { RecordQueryOptions } from "@lynxland/uikit-react";
import { useRecord } from "@lynxland/uikit-react";
import {
  type FieldView,
  PageLayout,
  type PageLayoutProps,
  RecordView,
  type RecordViewTab,
} from "@lynxland/uikit-surfaces";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { type ReactNode, useCallback, useState } from "react";

/**
 * Default record page (design.md §6.4): `PageLayout + RecordView + useRecord`.
 *
 * `title`/`meta`/`actions` are hero slots rendered by `RecordView` (h2 level);
 * the page itself never renders an `h1` unless a `description` gives PageLayout
 * a header. Tab state is URL-backed only when `from` is supplied and the caller
 * does not control `activeTab`/`onTabChange`.
 */
export interface RecordPageProps<Row> {
  title?: (row: Row) => ReactNode;
  meta?: (row: Row) => ReactNode;
  actions?: (row: Row) => ReactNode;
  source: RecordSource<Row>;
  id: string | undefined;
  fields?: readonly FieldView<Row>[];
  tabs?: readonly RecordViewTab<Row>[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  from?: string;
  scope?: Scope;
  query?: RecordQueryOptions;
  backLink?: ReactNode;
  breadcrumb?: ReactNode;
  description?: ReactNode;
  width?: PageLayoutProps["width"];
  className?: string;
}

interface RecordPageContentProps<Row>
  extends Omit<RecordPageProps<Row>, "from" | "activeTab" | "onTabChange"> {
  activeTab?: string;
  onTabChange?: (key: string) => void;
}

function RecordPageContent<Row>({
  title,
  meta,
  actions,
  source,
  id,
  fields,
  tabs,
  activeTab,
  onTabChange,
  scope,
  query,
  backLink,
  breadcrumb,
  description,
  width,
  className,
}: RecordPageContentProps<Row>) {
  const record = useRecord(source, id, {
    ...(query ?? {}),
    ...(scope !== undefined ? { scope } : {}),
  });

  return (
    <PageLayout
      {...(description !== undefined ? { description } : {})}
      {...(backLink !== undefined ? { backLink } : {})}
      {...(breadcrumb !== undefined ? { breadcrumb } : {})}
      width={width ?? "wide"}
      {...(className !== undefined ? { className } : {})}
    >
      <RecordView<Row>
        record={record}
        {...(title !== undefined ? { title } : {})}
        {...(meta !== undefined ? { meta } : {})}
        {...(actions !== undefined ? { actions } : {})}
        {...(fields !== undefined ? { fields } : {})}
        {...(tabs !== undefined ? { tabs } : {})}
        {...(activeTab !== undefined ? { activeTab } : {})}
        {...(onTabChange !== undefined ? { onTabChange } : {})}
      />
    </PageLayout>
  );
}

interface FunctionalNavigateOptions {
  to: ".";
  search: (prev: Record<string, unknown>) => Record<string, unknown>;
  replace?: boolean;
}

type FunctionalNavigate = (options: FunctionalNavigateOptions) => Promise<void> | void;

interface UrlTabRecordPageProps<Row>
  extends Omit<RecordPageProps<Row>, "from" | "activeTab" | "onTabChange"> {
  from: string;
}

function UrlTabRecordPage<Row>({ from, ...rest }: UrlTabRecordPageProps<Row>) {
  const raw = useSearch({ from: from as never, strict: false }) as unknown as Record<
    string,
    unknown
  >;
  const navigate = useNavigate();
  const tab = typeof raw.tab === "string" && raw.tab !== "" ? raw.tab : undefined;
  const setTab = useCallback(
    (key: string) => {
      void (navigate as unknown as FunctionalNavigate)({
        to: ".",
        search: (prev) => ({ ...prev, tab: key }),
        replace: true,
      });
    },
    [navigate],
  );

  return (
    <RecordPageContent
      {...rest}
      {...(tab !== undefined ? { activeTab: tab } : {})}
      onTabChange={setTab}
    />
  );
}

function LocalTabRecordPage<Row>({
  ...rest
}: Omit<RecordPageProps<Row>, "from" | "activeTab" | "onTabChange">) {
  const [tab, setTab] = useState<string | undefined>(undefined);
  return (
    <RecordPageContent
      {...rest}
      {...(tab !== undefined ? { activeTab: tab } : {})}
      onTabChange={setTab}
    />
  );
}

export function RecordPage<Row>(props: RecordPageProps<Row>) {
  const { activeTab, onTabChange, from, ...rest } = props;

  // The outer component calls no hooks, so the three tab strategies can be
  // separate components without conditional hook calls. This also avoids
  // calling `useSearch` on a route that may not exist when `from` is absent.
  if (activeTab !== undefined || onTabChange !== undefined) {
    return (
      <RecordPageContent
        {...rest}
        {...(activeTab !== undefined ? { activeTab } : {})}
        {...(onTabChange !== undefined ? { onTabChange } : {})}
      />
    );
  }
  if (from !== undefined) {
    return <UrlTabRecordPage {...rest} from={from} />;
  }
  return <LocalTabRecordPage {...rest} />;
}
