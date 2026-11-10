import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { AppShell, findActiveNavItem, type AppShellNavItem } from "../src/chrome";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

const nav = [
  {
    label: "Workspace",
    items: [
      { label: "Widgets", to: "/widgets" },
      { label: "Settings", to: "/settings" },
    ],
  },
];

function withAdapter(node: ReactNode) {
  return <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>;
}

describe("findActiveNavItem", () => {
  it("uses longest-prefix matching and keeps a parent active on detail routes", () => {
    const nested = [
      {
        label: "Data",
        items: [
          { label: "Widgets", to: "/widgets" },
          { label: "Keyset", to: "/widgets/keyset" },
          { label: "Exact", to: "/exact", exact: true },
        ],
      },
    ];
    expect(findActiveNavItem(nested, "/widgets")?.label).toBe("Widgets");
    expect(findActiveNavItem(nested, "/widgets/keyset")?.label).toBe("Keyset");
    expect(findActiveNavItem(nested, "/widgets/widget-1")?.label).toBe("Widgets");
    expect(findActiveNavItem(nested, "/exact")?.label).toBe("Exact");
    expect(findActiveNavItem(nested, "/exact/child")).toBeUndefined();
    expect(findActiveNavItem(nested, "/")?.label).toBeUndefined();
  });

  it("supports nested groups and badges", () => {
    const grouped = [
      {
        label: "Settings",
        items: [
          {
            label: "Settings",
            to: "/settings",
            children: [
              { label: "Servers", to: "/settings/servers" },
              { label: "SSH keys", to: "/settings/ssh", badge: 3 },
            ],
          },
        ],
      },
    ];
    expect(findActiveNavItem(grouped, "/settings/ssh")?.label).toBe("SSH keys");
    render(
      withAdapter(
        <AppShell nav={grouped} activePath="/settings/ssh">
          content
        </AppShell>,
      ),
    );
    expect(screen.getByRole("button", { name: /Settings/ }).getAttribute("aria-expanded")).toBe(
      "true",
    );
    const ssh = screen.getByRole("link", { name: /SSH keys/ });
    expect(ssh.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("3")).toBeTruthy();
  });
});

describe("AppShell", () => {
  it("computes the active item from activePath", () => {
    render(
      withAdapter(
        <AppShell brand="Console" nav={nav} activePath="/widgets/123">
          <div>main content</div>
        </AppShell>,
      ),
    );
    expect(
      screen.getByRole("link", { name: "Widgets" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Settings" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("renders default anchors and marks the active item", () => {
    render(
      withAdapter(
        <AppShell brand="Console" nav={nav} isActive={(item) => item.to === "/widgets"}>
          <div>main content</div>
        </AppShell>,
      ),
    );

    expect(screen.getByText("Console")).toBeTruthy();
    const widgets = screen.getByRole("link", { name: "Widgets" }) as HTMLAnchorElement;
    expect(widgets.getAttribute("href")).toBe("/widgets");
    expect(widgets.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("main content")).toBeTruthy();
  });

  it("renders sidebar header/footer, main header and collapse toggle", () => {
    render(
      withAdapter(
        <AppShell
          nav={nav}
          sidebarHeader={<div>Team switcher</div>}
          sidebarFooter={<div>User menu</div>}
          header={<div>Global search</div>}
          collapsible
        >
          content
        </AppShell>,
      ),
    );
    expect(screen.getByText("Team switcher")).toBeTruthy();
    expect(screen.getByText("User menu")).toBeTruthy();
    expect(screen.getByText("Global search")).toBeTruthy();
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy();
    expect(screen.getByTestId("app-shell").getAttribute("data-collapsed")).toBe("true");
  });

  it("renders the sidebar footer slot", () => {
    render(
      withAdapter(
        <AppShell nav={nav} sidebarFooter={<button type="button">Theme</button>}>
          content
        </AppShell>,
      ),
    );
    expect(screen.getByRole("button", { name: "Theme" })).toBeTruthy();
  });

  it("keeps icon/badge around a custom renderLink", () => {
    const iconNav = [
      {
        label: "Workspace",
        items: [{ label: "Projects", to: "/projects", icon: <span>ICON</span>, badge: 4 }],
      },
    ];
    render(
      withAdapter(
        <AppShell
          nav={iconNav}
          renderLink={(item) => <a href={item.to}>{item.label}</a>}
          activePath="/projects"
        >
          content
        </AppShell>,
      ),
    );
    expect(screen.getByText("ICON")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Projects" }).getAttribute("href")).toBe("/projects");
  });

  it("lets the app supply Router links and active state", () => {
    const renderLink = (item: AppShellNavItem) => (
      <a href={`/app${item.to}`} data-custom="true">
        {item.label}
      </a>
    );
    render(
      withAdapter(
        <AppShell nav={nav} renderLink={renderLink} isActive={(item) => item.to === "/settings"}>
          content
        </AppShell>,
      ),
    );

    const settings = screen.getByRole("link", { name: "Settings" }) as HTMLAnchorElement;
    expect(settings.getAttribute("href")).toBe("/app/settings");
    expect(settings.getAttribute("data-custom")).toBe("true");
    expect(
      screen
        .getAllByTestId("app-shell-custom-link")
        .map((node) => node.getAttribute("data-active")),
    ).toEqual([null, "true"]);
  });
});
