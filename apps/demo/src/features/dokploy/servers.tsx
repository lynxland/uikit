import { useCollection } from "@lynxland/uikit-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageLayout,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import {
  Activity,
  Clock,
  KeyRound,
  Network,
  Pencil,
  Plus,
  Server as ServerIcon,
  Settings2,
  Terminal,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { DokployCard } from "@/components/page-card";
import { deleteServer, type Server, serversEntity } from "@/lib/dokploy";
import { CreateServerDialog } from "./forms";
import { DeleteCommandDialog } from "./shared";

function createdLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DokploySettingsServersPage() {
  const ui = useUiAdapter();
  const servers = useCollection(serversEntity.collection!, { window: { kind: "all" } });
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<Server | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loading = servers.status === "loading" || servers.status === "idle";

  return (
    <DokployCard fill={false}>
      <PageLayout
        width="content"
        titleSize="lg"
        headerDivider
        icon={<ServerIcon className="size-5 text-muted-foreground" aria-hidden />}
        title="Servers"
        description="Add servers to deploy your applications remotely."
      >
        {servers.status === "error" ? (
          <ErrorState error={servers.error} onRetry={servers.refetch} />
        ) : loading ? (
          <LoadingState rows={3} label="Loading servers" />
        ) : servers.rows.length === 0 ? (
          <EmptyState
            title="No servers yet"
            description="Register a server to schedule services onto it."
            action={
              <ui.Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                Create Server
              </ui.Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-3" data-testid="server-grid">
            {servers.rows.map((server) => {
              const build = server.name.toLowerCase().includes("build");
              return (
                <article
                  key={server.id}
                  className="flex min-w-0 flex-col rounded-xl border border-[var(--border)] bg-transparent p-4"
                  data-testid={`server-card-${server.id}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <ServerIcon size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {server.name}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ui.Badge tone={build ? "neutral" : "info"} variant="soft">
                      {build ? "build" : "deploy"}
                    </ui.Badge>
                  </div>

                  <dl className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Network size={12} className="text-muted-foreground" aria-hidden />
                      <dt className="text-muted-foreground">IP:</dt>
                      <dd className="font-mono">{server.host}</dd>
                      <dt className="ml-2 text-muted-foreground">Port:</dt>
                      <dd className="font-mono">22</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-muted-foreground" aria-hidden />
                      <dt className="text-muted-foreground">User:</dt>
                      <dd>root</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <KeyRound size={12} className="text-muted-foreground" aria-hidden />
                      <dt className="text-muted-foreground">SSH Key:</dt>
                      <dd>Yes</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--border)] pt-3 text-[11px] text-muted-foreground">
                    <Clock size={11} aria-hidden />
                    <span>Created {createdLabel(server.createdAt)}</span>
                  </div>

                  <ui.Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full justify-center gap-1.5"
                    onClick={() => setMessage(`${server.name} setup is a demo placeholder.`)}
                  >
                    Setup Server <Settings2 size={13} aria-hidden />
                  </ui.Button>

                  <div className="mt-2 flex items-center gap-1">
                    <ui.Tooltip
                      content={`Open terminal on ${server.name}`}
                      trigger={
                        <ui.Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 border border-[var(--border)]"
                          aria-label={`Open terminal on ${server.name}`}
                          onClick={() => setMessage("Open terminal is a demo placeholder.")}
                        >
                          <Terminal size={13} aria-hidden />
                        </ui.Button>
                      }
                    />
                    <ui.Tooltip
                      content={`Edit ${server.name}`}
                      trigger={
                        <ui.Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 border border-[var(--border)]"
                          aria-label={`Edit ${server.name}`}
                          onClick={() => setMessage("Edit server is a demo placeholder.")}
                        >
                          <Pencil size={13} aria-hidden />
                        </ui.Button>
                      }
                    />
                    <ui.Tooltip
                      content={`Monitor ${server.name}`}
                      trigger={
                        <ui.Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 border border-[var(--border)]"
                          aria-label={`Monitor ${server.name}`}
                          onClick={() => setMessage("Server monitoring is a demo placeholder.")}
                        >
                          <Activity size={13} aria-hidden />
                        </ui.Button>
                      }
                    />
                    <ui.Tooltip
                      content="Remove server"
                      trigger={
                        <ui.Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="ml-auto size-7 border border-[var(--border)] text-destructive"
                          aria-label="Remove server"
                          onClick={() => setDeleting(server)}
                          data-testid={`server-delete-${server.id}`}
                        >
                          <Trash2 size={13} aria-hidden />
                        </ui.Button>
                      }
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="flex justify-end">
          <ui.Button
            type="button"
            size="sm"
            onClick={() => setCreateOpen(true)}
            data-testid="add-server"
          >
            <Plus size={13} aria-hidden /> Create Server
          </ui.Button>
        </div>

        {message !== null ? (
          <p role="status" className="text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}
      </PageLayout>

      {createOpen ? <CreateServerDialog open onOpenChange={setCreateOpen} /> : null}

      {deleting !== null ? (
        <DeleteCommandDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title={`Remove ${deleting.name}?`}
          description="The host is removed from the registry. Services must be moved to another server first in a real deployment."
          command={deleteServer}
          input={deleting.id}
          entity={serversEntity.collection}
          entityId={deleting.id}
          confirmLabel="Remove server"
          confirmTestId="confirm-remove-server"
          onDeleted={() => setDeleting(null)}
        />
      ) : null}
    </DokployCard>
  );
}
