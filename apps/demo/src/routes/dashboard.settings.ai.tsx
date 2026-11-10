import { createFileRoute } from "@tanstack/react-router";
import { SettingsPlaceholderPage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/ai")({
  component: () => (
    <SettingsPlaceholderPage
      title="AI"
      description="AI-assisted operations and log analysis settings."
    />
  ),
});
