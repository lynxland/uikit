import { useTabParam } from "@lynxland/uikit-react/router";
import { createFileRoute } from "@tanstack/react-router";
import {
  APPLICATION_TABS,
  type ApplicationTab,
  DokployApplicationDetailPage,
} from "@/features/dokploy/application-detail";

function applicationTab(search: Record<string, unknown>): { tab?: ApplicationTab } {
  const tab = search.tab;
  if (typeof tab !== "string") return {};
  return APPLICATION_TABS.some((item) => item.value === tab) ? { tab: tab as ApplicationTab } : {};
}

export const Route = createFileRoute(
  "/dashboard/project/$projectId/environment/$environmentId/services/application/$applicationId",
)({
  validateSearch: applicationTab,
  component: ApplicationDetailRoute,
});

function ApplicationDetailRoute() {
  const { projectId, environmentId, applicationId } = Route.useParams();
  const tab = useTabParam({ from: Route.id, defaultValue: "general" });

  return (
    <DokployApplicationDetailPage
      projectId={projectId}
      environmentId={environmentId}
      appId={applicationId}
      tab={tab.value as ApplicationTab}
      onTabChange={(next) => tab.setValue(next)}
    />
  );
}
