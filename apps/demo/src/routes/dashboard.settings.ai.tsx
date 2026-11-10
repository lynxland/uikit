import { createFileRoute } from "@tanstack/react-router";
import { DokployAiSettingsPage } from "@/features/dokploy/settings-admin";

export const Route = createFileRoute("/dashboard/settings/ai")({
  component: DokployAiSettingsPage,
});
