import { createFileRoute } from "@tanstack/react-router";
import { DokployGitProvidersPage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/git-providers")({
  component: DokployGitProvidersPage,
});
