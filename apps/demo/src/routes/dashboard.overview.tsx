import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { DokployPlaceholderPage } from "@/features/dokploy/placeholder";

export const Route = createFileRoute("/dashboard/overview")({
  component: () => (
    <DokployPlaceholderPage
      title="Overview"
      description="Cross-project service and resource overview."
      icon={<LayoutGrid className="size-8" aria-hidden />}
    />
  ),
});
