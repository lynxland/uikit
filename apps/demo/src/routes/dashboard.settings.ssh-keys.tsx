import { createFileRoute } from "@tanstack/react-router";
import { DokploySshKeysPage } from "@/features/dokploy/settings";

export const Route = createFileRoute("/dashboard/settings/ssh-keys")({
  component: DokploySshKeysPage,
});
