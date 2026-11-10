import { createFileRoute } from "@tanstack/react-router";
import { DokployHomePage } from "@/features/dokploy/home";

export const Route = createFileRoute("/dashboard/home")({
  component: DokployHomePage,
});
