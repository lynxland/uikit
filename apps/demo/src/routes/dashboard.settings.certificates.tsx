import { createFileRoute } from "@tanstack/react-router";
import { DokployCertificatesPage } from "@/features/dokploy/settings-admin";

export const Route = createFileRoute("/dashboard/settings/certificates")({
  component: DokployCertificatesPage,
});
