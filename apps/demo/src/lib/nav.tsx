import type { AppShellNavSection } from "@lynxland/uikit-surfaces";
import {
  Activity,
  BarChartHorizontalBig,
  Blocks,
  BookOpen,
  Bot,
  Boxes,
  CircleHelp,
  ClipboardList,
  Clock,
  Folder,
  Forward,
  GalleryVerticalEnd,
  GitBranch,
  House,
  KeyRound,
  Network,
  Rocket,
  Server,
  Tags,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Dokploy navigation, as plain data. AppShell owns the markup; `__root.tsx`
 * wires `renderLink` to TanStack Router. The labels and order mirror the
 * official sidebar: Home group first, then Settings. Overview is intentionally
 * absent (the route remains reachable for links and deep tests); the rest of
 * the list matches the screenshots.
 */
export const nav: AppShellNavSection[] = [
  {
    label: "Home",
    items: [
      { label: "Home", to: "/dashboard/home", icon: <House size={16} /> },
      { label: "Projects", to: "/dashboard/projects", icon: <Folder size={16} /> },
      { label: "Deployments", to: "/dashboard/deployments", icon: <Rocket size={16} /> },
      {
        label: "Monitoring",
        to: "/dashboard/monitoring",
        icon: <BarChartHorizontalBig size={16} />,
      },
      { label: "Schedules", to: "/dashboard/schedules", icon: <Clock size={16} /> },
      {
        label: "Traefik File System",
        to: "/dashboard/traefik",
        icon: <GalleryVerticalEnd size={16} />,
      },
      { label: "Docker", to: "/dashboard/docker", icon: <Blocks size={16} /> },
      { label: "Swarm", to: "/dashboard/swarm", icon: <Network size={16} /> },
      { label: "Requests", to: "/dashboard/requests", icon: <Forward size={16} /> },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Web Server",
        to: "/dashboard/settings/web-server",
        icon: <Activity size={16} />,
      },
      { label: "Profile", to: "/dashboard/settings/profile", icon: <User size={16} /> },
      {
        label: "Remote Servers",
        to: "/dashboard/settings/servers",
        icon: <Server size={16} />,
      },
      {
        label: "Deployments",
        to: "/dashboard/settings/deployments",
        icon: <Boxes size={16} />,
      },
      { label: "Users", to: "/dashboard/settings/users", icon: <Users size={16} /> },
      {
        label: "Audit Logs",
        to: "/dashboard/settings/audit-logs",
        icon: <ClipboardList size={16} />,
      },
      {
        label: "SSH Keys",
        to: "/dashboard/settings/ssh-keys",
        icon: <KeyRound size={16} />,
      },
      { label: "AI", to: "/dashboard/settings/ai", icon: <Bot size={16} /> },
      { label: "Tags", to: "/dashboard/settings/tags", icon: <Tags size={16} /> },
      { label: "Git", to: "/dashboard/settings/git-providers", icon: <GitBranch size={16} /> },
    ],
  },
  {
    label: "Extra",
    items: [
      {
        label: "Documentation",
        to: "https://docs.dokploy.com/docs/core",
        icon: <BookOpen size={16} />,
      },
      {
        label: "Support",
        to: "https://discord.gg/2tBnJ3jDJc",
        icon: <CircleHelp size={16} />,
      },
    ],
  },
];

export interface NavDestination {
  label: string;
  to: string;
  section: string;
  icon: ReactNode;
}

/** Internal destinations only; the command palette does not open external help. */
export const navDestinations: readonly NavDestination[] = nav.flatMap((section) =>
  section.items
    .filter((item) => !item.to.startsWith("http"))
    .map((item) => ({
      label: typeof item.label === "string" ? item.label : item.to,
      to: item.to,
      section: typeof section.label === "string" ? section.label : "Other",
      icon: item.icon,
    })),
);

export function isExternalNav(to: string): boolean {
  return to.startsWith("http://") || to.startsWith("https://");
}
