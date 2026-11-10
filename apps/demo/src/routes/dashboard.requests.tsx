import { createFileRoute } from "@tanstack/react-router";
import { DokployRequestsPage } from "@/features/dokploy/fleet";

export const Route = createFileRoute("/dashboard/requests")({
  component: DokployRequestsPage,
});
