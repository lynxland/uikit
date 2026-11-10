import { createFileRoute } from "@tanstack/react-router";
import { SettingsPlaceholderPage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/sessions")({
  component: () => (
    <SettingsPlaceholderPage title="Sessions" description="Active sessions across devices." />
  ),
});
