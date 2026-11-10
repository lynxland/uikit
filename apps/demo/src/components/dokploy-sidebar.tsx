import { StatusDot, useTheme, useUiAdapter } from "@lynxland/uikit-surfaces";
import { useNavigate } from "@tanstack/react-router";
import { Bell, ChevronsUpDown, Download } from "lucide-react";
import { useState } from "react";
import { DokployLogo } from "./dokploy-logo";

const ORGANIZATIONS = [
  { value: "lynxland", label: "My Organization" },
  { value: "platform", label: "Platform" },
  { value: "growth", label: "Growth" },
] as const;

/**
 * Dokploy sidebar header: organization switcher (logo + name + Enterprise +
 * chevron), notification bell and a small command-palette icon. The official
 * sidebar has no full-width search field; ⌘K stays available everywhere.
 */
export function DokploySidebarHeader() {
  const ui = useUiAdapter();
  const [organization, setOrganization] = useState<string>("lynxland");

  return (
    <div className="flex items-center gap-1">
      <ui.Menu
        aria-label="Organization menu"
        align="start"
        side="bottom"
        trigger={
          <ui.Button
            type="button"
            variant="ghost"
            className="h-auto min-w-0 flex-1 justify-start gap-2 px-1 py-1"
            data-testid="organization-trigger"
          >
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--background)]">
              <DokployLogo className="size-4" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="flex min-w-0 items-start gap-1.5">
                <span className="min-w-0 max-w-[4.75rem] whitespace-normal text-[13px] font-medium leading-tight">
                  {ORGANIZATIONS.find((item) => item.value === organization)?.label ??
                    "My Organization"}
                </span>
                <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-sky-400">
                  Enterprise
                </span>
              </span>
            </span>
            <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" aria-hidden />
          </ui.Button>
        }
        items={ORGANIZATIONS.map((item) => ({
          label: item.label,
          onSelect: () => setOrganization(item.value),
        }))}
      />

      <ui.Menu
        aria-label="Notifications"
        align="end"
        side="bottom"
        trigger={
          <ui.Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative size-8 shrink-0"
            aria-label="Notifications"
            data-testid="notification-bell"
          >
            <Bell size={15} aria-hidden="true" />
          </ui.Button>
        }
        items={[
          { label: "No pending invitations", disabled: true },
          { label: "All caught up", disabled: true },
        ]}
      />
    </div>
  );
}

/**
 * Dokploy sidebar footer: update card, account menu (theme switch lives here,
 * as in the official app) and the version line.
 */
export function DokploySidebarFooter() {
  const ui = useUiAdapter();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [updateOpen, setUpdateOpen] = useState(false);

  return (
    <div className="space-y-2">
      <ui.Button
        type="button"
        variant="outline"
        className="relative h-9 w-full justify-center gap-2 px-3 text-xs"
        onClick={() => setUpdateOpen(true)}
        data-testid="update-available"
      >
        <Download size={14} aria-hidden="true" />
        <span>Update Available</span>
        <span className="absolute right-3 inline-flex" aria-hidden="true">
          <StatusDot tone="success" pulse />
        </span>
      </ui.Button>

      <ui.Menu
        aria-label="Account menu"
        align="start"
        side="top"
        trigger={
          <ui.Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start gap-2 px-2 py-1.5"
            aria-label="Open account menu"
          >
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-[11px] font-semibold">
              AL
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-xs font-semibold">Account</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                admin@dokploy.com
              </span>
            </span>
            <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
          </ui.Button>
        }
        items={[
          {
            label: "Profile",
            onSelect: () => {
              void navigate({ to: "/dashboard/settings/profile" });
            },
          },
          {
            label: "Projects",
            onSelect: () => {
              void navigate({ to: "/dashboard/projects" });
            },
          },
          {
            label: "Remote Servers",
            onSelect: () => {
              void navigate({ to: "/dashboard/settings/servers" });
            },
          },
          {
            label: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
            onSelect: toggle,
          },
          { label: "Log out", disabled: true, separator: true },
        ]}
      />

      <div className="px-2 text-center text-[11px] text-muted-foreground">Version v0.29.10</div>

      <ui.Dialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        title="Update Available"
        description="Dokploy v0.29.10 is available. This demo clone does not run the updater."
        size="sm"
        footer={
          <ui.Button type="button" variant="outline" onClick={() => setUpdateOpen(false)}>
            Close
          </ui.Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          The update card, version line and account menu mirror the official sidebar. No server
          command is issued here.
        </p>
      </ui.Dialog>
    </div>
  );
}
