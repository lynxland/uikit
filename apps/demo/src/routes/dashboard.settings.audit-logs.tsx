import { createFileRoute } from "@tanstack/react-router";
import { DokployAuditLogsPage } from "@/features/dokploy/settings-admin";

export const Route = createFileRoute("/dashboard/settings/audit-logs")({
  component: DokployAuditLogsPage,
});
