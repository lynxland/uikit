import { createFileRoute } from "@tanstack/react-router";
import { Network } from "lucide-react";
import { DokployPlaceholderPage } from "@/features/dokploy/placeholder";

export const Route = createFileRoute("/dashboard/swarm")({
  component: () => (
    <DokployPlaceholderPage
      title="Swarm"
      description="Docker Swarm nodes, services and cluster state."
      icon={<Network className="size-8" aria-hidden />}
    />
  ),
});
