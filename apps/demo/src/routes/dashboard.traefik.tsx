import { createFileRoute } from "@tanstack/react-router";
import { DokployTraefikPage } from "@/features/dokploy/fleet";

export const Route = createFileRoute("/dashboard/traefik")({
  component: DokployTraefikPage,
});
