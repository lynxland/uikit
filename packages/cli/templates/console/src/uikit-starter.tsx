// Starter page: URL-backed collection in under 30 lines.
// Wire it into your router with validateSearch: widgetsSearch.schema and the
// core parseSearch/stringifySearch serializer. See README.md in this folder.
import { collectionSearch } from "@lynxland/uikit";
import { CollectionPage } from "@lynxland/uikit-preset-console";
import { widgetFields, widgetFilters, widgets } from "@/lib/widgets";

const widgetsSearch = collectionSearch({
  text: ["name"],
  filters: [{ field: "status", op: "eq" }],
  defaultSize: 20,
  defaultPage: { kind: "offset", offset: 0 },
});

export function WidgetsPage() {
  return (
    <CollectionPage
      title="Widgets"
      source={widgets}
      search={widgetsSearch}
      from="/widgets"
      fields={widgetFields}
      filters={widgetFilters}
    />
  );
}
