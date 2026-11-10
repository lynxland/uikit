import { createFileRoute } from "@tanstack/react-router";
import { DokployS3DestinationsPage } from "@/features/dokploy/settings-admin";

export const Route = createFileRoute("/dashboard/settings/s3-destinations")({
  component: DokployS3DestinationsPage,
});
