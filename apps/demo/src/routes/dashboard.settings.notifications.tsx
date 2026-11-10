import { createFileRoute } from "@tanstack/react-router";
import { DokployNotificationsPage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/notifications")({
  component: DokployNotificationsPage,
});
