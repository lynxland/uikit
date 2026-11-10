import { useTabParam } from "@lynxland/uikit-react/router";
import { createFileRoute } from "@tanstack/react-router";
import { DokployServiceDetailPage, serviceTabValues } from "@/features/dokploy/service-detail";

const TAB_VALUES = serviceTabValues("postgres");

export const Route = createFileRoute(
  "/dashboard/project/$projectId/environment/$environmentId/services/postgres/$serviceId",
)({
  component: PostgresDetailRoute,
});

function PostgresDetailRoute() {
  const { projectId, environmentId, serviceId } = Route.useParams();
  const tab = useTabParam({ from: Route.id, values: TAB_VALUES, defaultValue: "general" });
  return (
    <DokployServiceDetailPage
      projectId={projectId}
      environmentId={environmentId}
      serviceId={serviceId}
      tab={tab.value}
      onTabChange={(next) => tab.setValue(next)}
    />
  );
}
