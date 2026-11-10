import {
  EmptyState,
  PageLayout,
  SectionCard,
  ThemeToggle,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import {
  Bell,
  ExternalLink,
  GitBranch,
  Globe,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Server as ServerIcon,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { DokployCard } from "@/components/page-card";
import { notify } from "@/lib/feedback";

/** Honest placeholder for Settings routes that the strict clone does not implement. */
export function SettingsPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <DokployCard fill={false}>
      <PageLayout
        width="content"
        titleSize="lg"
        headerDivider
        title={title}
        description={description}
      >
        <EmptyState
          icon={<ServerIcon className="size-8" aria-hidden />}
          title="Not implemented in this clone"
          description="This route exists so navigation never dead-ends. The strict clone only ships the Home, Projects, environment, application, deployments and core Settings screens."
        />
      </PageLayout>
    </DokployCard>
  );
}

interface SshKey {
  id: string;
  name: string;
  fingerprint: string;
  createdAt: string;
  lastUsedAt: string;
}

const SSH_KEYS: readonly SshKey[] = [
  {
    id: "key-ada",
    name: "hetzer",
    fingerprint: "SHA256:9f2c…71aa",
    createdAt: "2026-04-12T09:12:00.000Z",
    lastUsedAt: "2026-11-08T08:01:00.000Z",
  },
  {
    id: "key-ci",
    name: "github-actions",
    fingerprint: "SHA256:be07…d412",
    createdAt: "2026-06-02T11:42:00.000Z",
    lastUsedAt: "2026-11-08T07:44:00.000Z",
  },
  {
    id: "key-ops",
    name: "ops-runbook",
    fingerprint: "SHA256:31aa…90ff",
    createdAt: "2026-02-18T15:05:00.000Z",
    lastUsedAt: "2026-11-06T22:10:00.000Z",
  },
];

export function DokploySshKeysPage() {
  const ui = useUiAdapter();

  return (
    <DokployCard fill={false}>
      <PageLayout
        width="content"
        titleSize="lg"
        headerDivider
        icon={<KeyRound className="size-5 text-muted-foreground" aria-hidden />}
        title="SSH Keys"
        description="Create and manage SSH Keys, you can use them to access your servers, git private repositories, and more."
      >
        <div className="flex flex-col gap-3">
          {SSH_KEYS.map((key, index) => (
            <div
              key={key.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3"
              data-testid={`ssh-key-${key.id}`}
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {index + 1}. {key.name}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <ui.Tooltip
                  content={`Edit ${key.name}`}
                  trigger={
                    <ui.Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label={`Edit ${key.name}`}
                      onClick={() => notify.placeholder("Editing SSH keys")}
                    >
                      <Pencil size={13} aria-hidden />
                    </ui.Button>
                  }
                />
                <ui.Tooltip
                  content={`Delete ${key.name}`}
                  trigger={
                    <ui.Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      aria-label={`Delete ${key.name}`}
                      onClick={() => notify.placeholder("Deleting SSH keys")}
                    >
                      <Trash2 size={13} aria-hidden />
                    </ui.Button>
                  }
                />
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <ui.Button type="button" size="sm" onClick={() => notify.placeholder("Key creation")}>
            <Plus size={13} aria-hidden /> Add SSH Key
          </ui.Button>
        </div>
      </PageLayout>
    </DokployCard>
  );
}

interface GitConnection {
  id: string;
  name: string;
  provider: "github" | "gitlab" | "bitbucket" | "gitea";
  createdAt: string;
  enabled: boolean;
}

const GIT_CONNECTIONS: readonly GitConnection[] = [
  {
    id: "git-1",
    name: "test",
    provider: "github",
    createdAt: "2026-03-03T23:11:08.000Z",
    enabled: false,
  },
  {
    id: "git-2",
    name: "test",
    provider: "github",
    createdAt: "2026-02-07T12:16:39.000Z",
    enabled: false,
  },
  {
    id: "git-3",
    name: "testttt",
    provider: "bitbucket",
    createdAt: "2025-09-21T04:25:28.000Z",
    enabled: false,
  },
  {
    id: "git-4",
    name: "test",
    provider: "gitea",
    createdAt: "2025-09-21T02:00:29.000Z",
    enabled: false,
  },
  {
    id: "git-5",
    name: "DokployTestings",
    provider: "github",
    createdAt: "2025-07-13T11:37:53.000Z",
    enabled: false,
  },
  {
    id: "git-6",
    name: "Dokploy-2025-08-03wqeq",
    provider: "github",
    createdAt: "2025-06-03T11:16:58.000Z",
    enabled: false,
  },
];

const PROVIDER_BUTTONS = [
  {
    id: "github",
    label: "GitHub",
    className: "border-transparent bg-[#24292f] text-white hover:bg-[#32383f]",
  },
  {
    id: "gitlab",
    label: "GitLab",
    className: "border-transparent bg-[#6e49cb] text-white hover:bg-[#7d5ad4]",
  },
  {
    id: "bitbucket",
    label: "Bitbucket",
    className: "border-transparent bg-[#2684ff] text-white hover:bg-[#3d92ff]",
  },
  {
    id: "gitea",
    label: "Gitea",
    className: "border-transparent bg-[#2e9e44] text-white hover:bg-[#37ad4e]",
  },
] as const;

const PROVIDER_DOT: Record<GitConnection["provider"], string> = {
  github: "bg-[#f0f6fc] text-[#24292f]",
  gitlab: "bg-[#6e49cb] text-white",
  bitbucket: "bg-[#2684ff] text-white",
  gitea: "bg-[#2e9e44] text-white",
};

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function DokployGitProvidersPage() {
  const ui = useUiAdapter();
  const [enabled, setEnabled] = useState<ReadonlySet<string>>(
    new Set(GIT_CONNECTIONS.filter((item) => item.enabled).map((item) => item.id)),
  );

  return (
    <DokployCard fill={false}>
      <PageLayout
        width="content"
        titleSize="lg"
        headerDivider
        icon={<GitBranch className="size-5 text-muted-foreground" aria-hidden />}
        title="Git Providers"
        description="Connect your Git provider for authentication."
      >
        <div>
          <h2 className="text-sm font-medium">Available Providers</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROVIDER_BUTTONS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors ${provider.className}`}
                onClick={() => notify.placeholder(`${provider.label} setup`)}
              >
                <BrandMark provider={provider.id} className="size-3.5" /> {provider.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2" data-testid="git-connections">
          {GIT_CONNECTIONS.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3"
            >
              <span
                className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ${PROVIDER_DOT[connection.provider]}`}
                aria-hidden
              >
                <BrandMark provider={connection.provider} className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{connection.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {dateLabel(connection.createdAt)}
                </div>
              </div>
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="sr-only">Enable {connection.name}</span>
                <ui.Switch
                  checked={enabled.has(connection.id)}
                  aria-label={`Enable ${connection.name}`}
                  onCheckedChange={(checked) => {
                    setEnabled((current) => {
                      const next = new Set(current);
                      if (checked) next.add(connection.id);
                      else next.delete(connection.id);
                      return next;
                    });
                  }}
                />
              </div>
              <ui.Tooltip
                content={`Open ${connection.name}`}
                trigger={
                  <ui.Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={`Open ${connection.name}`}
                    onClick={() => notify.placeholder("Opening provider connections")}
                  >
                    <ExternalLink size={13} aria-hidden />
                  </ui.Button>
                }
              />
              <ui.Tooltip
                content={`Delete ${connection.name}`}
                trigger={
                  <ui.Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${connection.name}`}
                    onClick={() => notify.placeholder("Deleting provider connections")}
                  >
                    <Trash2 size={13} aria-hidden />
                  </ui.Button>
                }
              />
            </div>
          ))}
        </div>
      </PageLayout>
    </DokployCard>
  );
}

export function DokployWebServerPage() {
  const ui = useUiAdapter();
  const [domain, setDomain] = useState("hostinger.dokploy.com");
  const [email, setEmail] = useState("siumauricio@hotmail.com");
  const [https, setHttps] = useState(true);
  const [certificate, setCertificate] = useState("letsencrypt");
  const [dailyCleanup, setDailyCleanup] = useState(true);

  const action = (label: string) => notify.placeholder(label);

  return (
    <DokployCard fill={false}>
      <PageLayout
        width="content"
        titleSize="lg"
        headerDivider
        icon={<Globe className="size-5 text-muted-foreground" aria-hidden />}
        title="Server Domain"
        description="Add a domain to your server application."
      >
        <div className="rounded-xl border border-[var(--border)] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <ui.Field label="Domain" htmlFor="web-server-domain">
              <ui.Input
                id="web-server-domain"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
              />
            </ui.Field>
            <ui.Field label="Let's Encrypt Email" htmlFor="web-server-email">
              <ui.Input
                id="web-server-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </ui.Field>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] px-4 py-3">
            <div>
              <div className="text-sm font-medium">HTTPS</div>
              <div className="text-xs text-muted-foreground">
                Automatically provision SSL Certificate.
              </div>
            </div>
            <ui.Switch checked={https} onCheckedChange={setHttps} aria-label="HTTPS" />
          </div>

          <div className="mt-4">
            <ui.Field label="Certificate Provider" htmlFor="web-server-certificate">
              <ui.Select
                aria-label="Certificate Provider"
                value={certificate}
                onValueChange={setCertificate}
                options={[
                  { value: "letsencrypt", label: "Let's Encrypt" },
                  { value: "none", label: "None" },
                ]}
              />
            </ui.Field>
          </div>

          <div className="mt-5 flex justify-end">
            <ui.Button type="button" size="sm" onClick={() => notify.saved("Server domain saved.")}>
              Save
            </ui.Button>
          </div>
        </div>

        <section className="rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="text-base font-semibold">Web Server</h2>
            <p className="mt-1 text-sm text-muted-foreground">Reload or clean the web server.</p>
          </div>
          <div className="p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <ui.Button type="button" variant="outline" size="sm" onClick={() => action("Reload")}>
                Server
              </ui.Button>
              <ui.Button type="button" variant="outline" size="sm" onClick={() => action("Reload")}>
                Traefik
              </ui.Button>
              <ui.Button type="button" variant="outline" size="sm" onClick={() => action("Clean")}>
                Space
              </ui.Button>
              <ui.Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => action("Check for updates")}
              >
                Check for updates
              </ui.Button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-4 text-xs text-muted-foreground">
              <span>Server IP: 192.168.1.100</span>
              <span>Version: v0.29.10</span>
              <span className="ml-auto inline-flex items-center gap-2">
                <ui.Switch
                  checked={dailyCleanup}
                  onCheckedChange={setDailyCleanup}
                  aria-label="Daily Docker Cleanup"
                />
                Daily Docker Cleanup
              </span>
            </div>
          </div>
        </section>
      </PageLayout>
    </DokployCard>
  );
}

const ORGANIZATION_USERS = [
  {
    id: "usr-sarah",
    email: "sarah@dokploy.com",
    role: "developer",
    created: "Mar 2, 2025, 4:00:38 AM",
  },
  {
    id: "usr-admin",
    email: "admin@dokploy.com",
    role: "owner",
    created: "Mar 2, 2025, 4:00:38 AM",
    you: true,
  },
  {
    id: "usr-carlos",
    email: "carlos@dokploy.com",
    role: "member",
    created: "Feb 10, 2026, 9:35:47 PM",
  },
  {
    id: "usr-maria",
    email: "maria@dokploy.com",
    role: "developer",
    created: "Mar 16, 2026, 8:51:23 AM",
  },
] as const;

export function DokployUsersPage() {
  const ui = useUiAdapter();

  return (
    <DokployCard fill={false}>
      <PageLayout
        width="content"
        titleSize="lg"
        headerDivider
        icon={<Users className="size-5 text-muted-foreground" aria-hidden />}
        title="Users"
        description="Add your users to your Dokploy account."
      >
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[38rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">2FA</th>
                <th className="px-5 py-3 font-medium">Created At</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ORGANIZATION_USERS.map((user) => (
                <tr key={user.id} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="px-5 py-4">
                    {user.email}
                    {"you" in user ? <span className="text-muted-foreground"> (You)</span> : null}
                  </td>
                  <td className="px-5 py-4">
                    <ui.Badge tone={user.role === "owner" ? "neutral" : "info"} variant="soft">
                      {user.role}
                    </ui.Badge>
                  </td>
                  <td className="px-5 py-4">Disabled</td>
                  <td className="px-5 py-4 text-muted-foreground">{user.created}</td>
                  <td className="px-5 py-4">
                    <ui.Tooltip
                      content={`Actions for ${user.email}`}
                      trigger={
                        <ui.Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label={`Actions for ${user.email}`}
                          onClick={() => notify.placeholder("User actions")}
                        >
                          <span aria-hidden>•••</span>
                        </ui.Button>
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Mail size={16} aria-hidden /> Invitations
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create invitations to your organization.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
            <Users size={28} className="text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Invite users to your organization</p>
            <ui.Button type="button" size="sm" onClick={() => notify.placeholder("Invitations")}>
              <Plus size={13} aria-hidden /> Add Invitation
            </ui.Button>
          </div>
        </section>
      </PageLayout>
    </DokployCard>
  );
}

const NOTIFICATION_CHANNELS = [{ id: "ntf-slack", name: "dsfgdsfg", provider: "slack" }] as const;

export function DokployNotificationsPage() {
  const ui = useUiAdapter();

  return (
    <DokployCard fill={false}>
      <PageLayout
        width="content"
        titleSize="lg"
        headerDivider
        icon={<Bell className="size-5 text-muted-foreground" aria-hidden />}
        title="Notifications"
        description="Add your providers to receive notifications, like Discord, Slack, Telegram, Teams, Email, Resend, Lark."
      >
        <div className="flex flex-col gap-3">
          {NOTIFICATION_CHANNELS.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3"
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#4a154b] text-white">
                <BrandMark provider={channel.provider} className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{channel.name}</span>
              <ui.Tooltip
                content={`Edit ${channel.name}`}
                trigger={
                  <ui.Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={`Edit ${channel.name}`}
                    onClick={() => notify.placeholder("Editing notifications")}
                  >
                    <Pencil size={13} aria-hidden />
                  </ui.Button>
                }
              />
              <ui.Tooltip
                content={`Delete ${channel.name}`}
                trigger={
                  <ui.Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive"
                    aria-label={`Delete ${channel.name}`}
                    onClick={() => notify.placeholder("Deleting notifications")}
                  >
                    <Trash2 size={13} aria-hidden />
                  </ui.Button>
                }
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <ui.Button
            type="button"
            size="sm"
            onClick={() => notify.placeholder("Adding notifications")}
          >
            <Plus size={13} aria-hidden /> Add Notification
          </ui.Button>
        </div>
      </PageLayout>
    </DokployCard>
  );
}

export function DokployProfilePage() {
  const ui = useUiAdapter();
  const [name, setName] = useState("Ada Lovelace");
  const [email, setEmail] = useState("ada@example.com");
  const [organization, setOrganization] = useState("platform");

  return (
    <DokployCard fill={false}>
      <PageLayout
        width="content"
        titleSize="lg"
        headerDivider
        title="Profile"
        description="Account details, organization and appearance."
        actions={
          <ui.Button type="button" size="sm" onClick={() => notify.savedLocally("Profile")}>
            Save profile
          </ui.Button>
        }
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Account" description="Displayed across the dashboard.">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--secondary)] text-base font-semibold">
                  AL
                </span>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <User size={14} aria-hidden /> {name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{email}</div>
                </div>
              </div>
              <ui.Field label="Name" htmlFor="profile-name">
                <ui.Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </ui.Field>
              <ui.Field label="Email" htmlFor="profile-email">
                <ui.Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </ui.Field>
            </div>
          </SectionCard>

          <SectionCard title="Organization" description="Team context for projects and servers.">
            <div className="flex flex-col gap-4">
              <ui.Field label="Organization" htmlFor="profile-org">
                <ui.Select
                  aria-label="Organization"
                  value={organization}
                  onValueChange={setOrganization}
                  options={[
                    { value: "platform", label: "Platform" },
                    { value: "growth", label: "Growth" },
                    { value: "infrastructure", label: "Infrastructure" },
                  ]}
                />
              </ui.Field>
              <ui.Field label="Role" htmlFor="profile-role">
                <ui.Input id="profile-role" value="Owner" readOnly />
              </ui.Field>
              <div className="rounded-lg border border-[var(--border)] p-3 text-xs text-muted-foreground">
                Theme preference is stored locally by ThemeProvider.
                <div className="mt-2">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </PageLayout>
    </DokployCard>
  );
}
