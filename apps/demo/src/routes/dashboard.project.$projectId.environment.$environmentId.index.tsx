import { createFileRoute } from "@tanstack/react-router";
import { DokployProjectEnvironmentPage } from "@/features/dokploy/project-detail";

export const Route = createFileRoute("/dashboard/project/$projectId/environment/$environmentId/")({
  component: ProjectEnvironmentRoute,
});

function ProjectEnvironmentRoute() {
  const { projectId, environmentId } = Route.useParams();
  return <DokployProjectEnvironmentPage projectId={projectId} environmentId={environmentId} />;
}
