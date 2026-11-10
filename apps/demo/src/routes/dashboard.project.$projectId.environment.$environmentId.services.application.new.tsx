import { createFileRoute } from "@tanstack/react-router";
import { DokployApplicationNewPage } from "@/features/dokploy/application-new";

export const Route = createFileRoute(
  "/dashboard/project/$projectId/environment/$environmentId/services/application/new",
)({
  component: NewApplicationRoute,
});

function NewApplicationRoute() {
  const { projectId, environmentId } = Route.useParams();
  return <DokployApplicationNewPage projectId={projectId} environmentId={environmentId} />;
}
