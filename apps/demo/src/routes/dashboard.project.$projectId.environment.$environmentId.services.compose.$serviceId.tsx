import { useTabParam } from "@lynxland/uikit-react/router";
import { createFileRoute } from "@tanstack/react-router";
import {
  DokployServiceDetailPage,
  type ServiceTab,
  serviceTabs,
  serviceTabValidator,
} from "@/features/dokploy/service-detail";

export const Route = createFileRoute(
  "/dashboard/project/$projectId/environment/$environmentId/services/compose/$serviceId",
)({
  validateSearch: serviceTabValidator("compose"),
  component: ComposeDetailRoute,
});

function ComposeDetailRoute() {
  const { projectId, environmentId, serviceId } = Route.useParams();
  const tab = useTabParam({ from: Route.id, defaultValue: "general" });
  return (
    <DokployServiceDetailPage
      projectId={projectId}
      environmentId={environmentId}
      serviceId={serviceId}
      tab={
        (serviceTabs("compose").some((item) => item.value === tab.value)
          ? tab.value
          : "general") as ServiceTab
      }
      onTabChange={(next) => tab.setValue(next)}
    />
  );
}
