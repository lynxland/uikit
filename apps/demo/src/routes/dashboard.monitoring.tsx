import { createFileRoute } from "@tanstack/react-router";
import { DokployMonitoringPage } from "@/features/dokploy/monitoring";

export const Route = createFileRoute("/dashboard/monitoring")({
  component: DokployMonitoringPage,
});
