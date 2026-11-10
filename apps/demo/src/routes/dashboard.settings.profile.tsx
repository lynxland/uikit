import { createFileRoute } from "@tanstack/react-router";
import { DokployProfilePage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/profile")({
  component: DokployProfilePage,
});
