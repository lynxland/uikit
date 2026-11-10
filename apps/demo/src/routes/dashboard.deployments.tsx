import { createFileRoute } from "@tanstack/react-router";
import { DokployDeploymentsPage } from "@/features/dokploy/deployments";
import { deploymentsSearch } from "@/lib/dokploy";

export const Route = createFileRoute("/dashboard/deployments")({
  validateSearch: deploymentsSearch.schema,
  component: DeploymentsRoute,
});

function DeploymentsRoute() {
  return <DokployDeploymentsPage from={Route.id} />;
}
