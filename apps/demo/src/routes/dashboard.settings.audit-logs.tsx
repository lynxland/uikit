import { createFileRoute } from "@tanstack/react-router";
import { SettingsPlaceholderPage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/audit-logs")({
  component: () => (
    <SettingsPlaceholderPage
      title="Audit Logs"
      description="Security-relevant actions across the organization."
    />
  ),
});
