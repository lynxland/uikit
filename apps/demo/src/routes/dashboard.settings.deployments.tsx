import { createFileRoute } from "@tanstack/react-router";
import { SettingsPlaceholderPage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/deployments")({
  component: () => (
    <SettingsPlaceholderPage
      title="Deployments"
      description="Deployment defaults, queue concurrency and cleanup policy."
    />
  ),
});
