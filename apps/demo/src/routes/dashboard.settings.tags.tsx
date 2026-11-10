import { createFileRoute } from "@tanstack/react-router";
import { SettingsPlaceholderPage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/tags")({
  component: () => (
    <SettingsPlaceholderPage
      title="Tags"
      description="Labels shared by projects, services and deployments."
    />
  ),
});
