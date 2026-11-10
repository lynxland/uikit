import { createFileRoute } from "@tanstack/react-router";
import { DokployDockerPage } from "@/features/dokploy/fleet";

export const Route = createFileRoute("/dashboard/docker")({
  component: DokployDockerPage,
});
