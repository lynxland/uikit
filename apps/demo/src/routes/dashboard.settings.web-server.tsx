import { createFileRoute } from "@tanstack/react-router";
import { DokployWebServerPage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/web-server")({
  component: DokployWebServerPage,
});
