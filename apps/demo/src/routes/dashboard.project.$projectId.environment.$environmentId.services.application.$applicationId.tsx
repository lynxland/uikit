import { useTabParam } from "@lynxland/uikit-react/router";
import { createFileRoute } from "@tanstack/react-router";
import {
  APPLICATION_TAB_VALUES,
  DokployApplicationDetailPage,
} from "@/features/dokploy/application-detail";

export const Route = createFileRoute(
  "/dashboard/project/$projectId/environment/$environmentId/services/application/$applicationId",
)({
  component: ApplicationDetailRoute,
});

function ApplicationDetailRoute() {
  const { projectId, environmentId, applicationId } = Route.useParams();
  const tab = useTabParam({
    from: Route.id,
    values: APPLICATION_TAB_VALUES,
    defaultValue: "general",
  });

  return (
    <DokployApplicationDetailPage
      projectId={projectId}
      environmentId={environmentId}
      appId={applicationId}
      tab={tab.value}
      onTabChange={(next) => tab.setValue(next)}
    />
  );
}
