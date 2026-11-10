import { createFileRoute } from "@tanstack/react-router";
import { DokployLicensePage } from "@/features/dokploy/settings-admin";

export const Route = createFileRoute("/dashboard/settings/license")({
  component: DokployLicensePage,
});
