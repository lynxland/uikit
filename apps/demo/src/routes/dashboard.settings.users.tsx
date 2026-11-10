import { createFileRoute } from "@tanstack/react-router";
import { DokployUsersPage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/users")({
  component: DokployUsersPage,
});
