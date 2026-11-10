import { createFileRoute } from "@tanstack/react-router";
import { BarChartHorizontalBig } from "lucide-react";
import { DokployPlaceholderPage } from "@/features/dokploy/placeholder";

export const Route = createFileRoute("/dashboard/monitoring")({
  component: () => (
    <DokployPlaceholderPage
      title="Monitoring"
      description="Server and container telemetry across the fleet."
      icon={<BarChartHorizontalBig className="size-8" aria-hidden />}
    />
  ),
});
