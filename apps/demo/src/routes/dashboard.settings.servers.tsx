import { createFileRoute } from "@tanstack/react-router";
import { DokploySettingsServersPage } from "@/features/dokploy/servers";

export const Route = createFileRoute("/dashboard/settings/servers")({
  component: DokploySettingsServersPage,
});
