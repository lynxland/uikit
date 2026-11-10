import { createFileRoute } from "@tanstack/react-router";
import { DokploySchedulesPage } from "@/features/dokploy/fleet";

export const Route = createFileRoute("/dashboard/schedules")({
  component: DokploySchedulesPage,
});
