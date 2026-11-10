import { createFileRoute } from "@tanstack/react-router";
import { DokployRegistryPage } from "@/features/dokploy/settings-admin";

export const Route = createFileRoute("/dashboard/settings/registry")({
  component: DokployRegistryPage,
});
