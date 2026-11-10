import type { ApiError, CollectionSearch, CollectionSource, Scope } from "@lynxland/uikit-core";
import type { CollectionQueryOptions } from "@lynxland/uikit-react";
import { useCollectionPage } from "@lynxland/uikit-react/router";
import {
  type AsyncStateProps,
  type CollectionFilterChange,
  CollectionView,
  type Column,
  type FieldView,
  type FilterField,
  PageLayout,
  type PageLayoutProps,
} from "@lynxland/uikit-surfaces";
import type { ReactNode } from "react";
import { columnsFromFields, filterFieldsFromSpec, filterFieldsOf } from "../columns";

/**
 * Default collection page (design.md §6.4): `PageLayout + CollectionView +
 * useCollectionPage`.
 *
 * This is a composition root, not a second control layer: every part can be
 * replaced by hand-wiring `PageLayout + CollectionView` with the same handle.
 */
export interface CollectionPageProps<Row extends object> {
  title?: ReactNode;
  description?: ReactNode;
  source: CollectionSource<Row>;
  search: CollectionSearch;
  from: string;
  fields?: readonly FieldView<Row>[];
  columns?: readonly Column<Row>[];
  filters?: readonly FilterField[];
  scope?: Scope;
  query?: CollectionQueryOptions;
  actions?: ReactNode;
  toolbar?: ReactNode;
  tabs?: PageLayoutProps["tabs"];
  currentTab?: string;
  onTabChange?: (value: string) => void;
  empty?: AsyncStateProps["empty"];
  onRowClick?: (row: Row) => void;
  getRowId?: (row: Row) => string;
  describeError?: (error: ApiError) => string;
  errorTitle?: string;
  width?: PageLayoutProps["width"];
  breadcrumb?: ReactNode;
  className?: string;
}

export function CollectionPage<Row extends object>({
  title,
  description,
  source,
  search,
  from,
  fields,
  columns,
  filters,
  scope,
  query,
  actions,
  toolbar,
  tabs,
  currentTab,
  onTabChange,
  empty,
  onRowClick,
  getRowId,
  describeError,
  errorTitle,
  width,
  breadcrumb,
  className,
}: CollectionPageProps<Row>) {
  const page = useCollectionPage(source, {
    search,
    from,
    ...(scope !== undefined ? { scope } : {}),
    ...(query !== undefined ? { query } : {}),
  });

  const state = page.state;

  let resolvedColumns: readonly Column<Row>[];
  if (columns !== undefined) {
    resolvedColumns = columns;
  } else if (fields !== undefined && fields.length > 0) {
    resolvedColumns = columnsFromFields(fields);
  } else {
    throw new Error(
      "@lynxland/uikit-preset-console CollectionPage: provide `columns` or `fields` " +
        "(fields are mapped to columns by `columnsFromFields`).",
    );
  }

  const resolvedFilters =
    filters ??
    (search.spec.filters !== undefined
      ? filterFieldsFromSpec(search.spec.filters)
      : fields !== undefined
        ? filterFieldsOf(fields)
        : []);

  const hasFilterUi = resolvedFilters.length > 0 || (search.spec.text?.length ?? 0) > 0;
  const filterState = { text: state.q ?? "", filters: state.filters ?? [] };

  const changeFilters = ({ text, filters: nextFilters }: CollectionFilterChange): void => {
    page.patchState({
      q: text === "" ? undefined : text,
      filters: nextFilters.length === 0 ? undefined : nextFilters,
    });
  };

  const view = (
    <CollectionView<Row>
      list={page}
      columns={resolvedColumns}
      {...(getRowId !== undefined ? { getRowId } : {})}
      {...(hasFilterUi
        ? { filters: resolvedFilters, filterState, onFilterChange: changeFilters }
        : {})}
      sort={state.sort}
      onSortChange={(sort) => {
        page.setSort(sort.length === 0 ? null : sort);
      }}
      pagerModel={page.pager}
      {...(toolbar !== undefined ? { toolbar } : {})}
      {...(onRowClick !== undefined ? { onRowClick } : {})}
      {...(empty !== undefined ? { empty } : {})}
      {...(describeError !== undefined ? { describeError } : {})}
      {...(errorTitle !== undefined ? { errorTitle } : {})}
    />
  );

  return (
    <PageLayout
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(actions !== undefined ? { actions } : {})}
      {...(tabs !== undefined ? { tabs } : {})}
      {...(currentTab !== undefined ? { currentTab } : {})}
      {...(onTabChange !== undefined ? { onTabChange } : {})}
      width={width ?? "wide"}
      {...(breadcrumb !== undefined ? { breadcrumb } : {})}
      {...(className !== undefined ? { className } : {})}
    >
      {view}
    </PageLayout>
  );
}
