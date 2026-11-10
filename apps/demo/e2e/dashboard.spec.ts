import { expect, test } from "@playwright/test";

test.describe("Dokploy shell and home", () => {
  test("root redirects to the Dokploy home, which renders stats and recent deploys", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard\/home$/);
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
    await expect(page.getByTestId("dokploy-page-card")).toBeVisible();
    await expect(page.getByText("Projects", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Services", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Deploys / 7d", { exact: true })).toBeVisible();
    await expect(page.getByText("Status", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("recent-deployments")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("recent-deployments").locator("li").first()).toContainText(
      "logs →",
    );

    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb).toContainText("Home");

    const shell = page.getByTestId("app-shell");
    await page.getByTestId("sidebar-toggle").click();
    await expect(shell).toHaveAttribute("data-collapsed", "true");
    await page.getByTestId("sidebar-toggle").click();
    await expect(shell).not.toHaveAttribute("data-collapsed", "true");

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Projects" })).toBeVisible();
    await expect(nav.locator('a[href="/dashboard/deployments"]')).toBeVisible();
    await expect(nav.getByRole("link", { name: "Swarm" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Remote Servers" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "href",
      "https://docs.dokploy.com/docs/core",
    );
  });

  test("command palette filters destinations, navigates and closes with escape", async ({
    page,
  }) => {
    await page.goto("/dashboard/home");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
    await page.keyboard.press("Control+k");
    const input = page.getByTestId("command-input");
    await expect(input).toBeVisible();
    await input.fill("ssh");
    await page.getByTestId("command-item-/dashboard/settings/ssh-keys").click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/ssh-keys$/);
    await expect(page.getByRole("heading", { level: 1, name: "SSH Keys" })).toBeVisible();

    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette")).toHaveCount(0);
  });

  test("overview stays an honest placeholder; web server is implemented", async ({ page }) => {
    await page.goto("/dashboard/overview");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    await expect(page.getByText("Not implemented in this clone")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Overview");

    await page.goto("/dashboard/settings/web-server");
    await expect(page.getByRole("heading", { level: 1, name: "Server Domain" })).toBeVisible();
    await expect(page.getByLabel("Domain")).toHaveValue("hostinger.dokploy.com");
    await expect(page.getByRole("heading", { name: "Web Server" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Web Server");
  });

  test("mobile shell uses a drawer and keeps the page heading visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/home");

    const heading = page.getByRole("heading", { level: 1, name: "Welcome back" });
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(0);

    // The desktop rail is hidden; navigation lives in the drawer.
    await expect(page.getByTestId("mobile-menu-toggle")).toBeVisible();
    await expect(page.getByTestId("app-shell-mobile-nav")).toHaveCount(0);

    await page.getByTestId("mobile-menu-toggle").click();
    const drawer = page.getByTestId("app-shell-mobile-nav");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("navigation", { name: "Main" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("app-shell-mobile-nav")).toHaveCount(0);

    await page.getByTestId("mobile-menu-toggle").click();
    await drawer.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/dashboard\/projects$/);
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
    await expect(page.getByTestId("app-shell-mobile-nav")).toHaveCount(0);
  });

  test("desktop collapsed mode is an icon rail", async ({ page }) => {
    await page.goto("/dashboard/home");
    const shell = page.getByTestId("app-shell");
    await expect(shell).toHaveAttribute("data-collapsed-mode", "icon");
    await page.getByTestId("sidebar-toggle").click();
    await expect(shell).toHaveAttribute("data-collapsed", "true");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Projects", exact: true })).toBeVisible();
    await expect(page.getByTestId("sidebar-toggle")).toHaveAttribute(
      "aria-label",
      "Expand sidebar",
    );
    await page.getByTestId("sidebar-toggle").click();
    await expect(shell).not.toHaveAttribute("data-collapsed", "true");

    // Collapse again and verify the icon-only target is still clickable.
    await page.getByTestId("sidebar-toggle").click();
    await expect(shell).toHaveAttribute("data-collapsed", "true");
    await nav.getByRole("link", { name: "Projects", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/projects$/);
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  });

  test("fleet pages match the official layouts", async ({ page }) => {
    await page.goto("/dashboard/traefik");
    await expect(
      page.getByRole("heading", { level: 1, name: "Traefik File System" }),
    ).toBeVisible();
    await expect(page.getByLabel("Traefik configuration")).toHaveValue(/providers:/);

    await page.goto("/dashboard/docker");
    await expect(page.getByRole("heading", { level: 1, name: "Docker Containers" })).toBeVisible();
    await expect(page.getByRole("row").nth(1)).toContainText("tools-storage");

    await page.goto("/dashboard/requests");
    await expect(page.getByRole("heading", { level: 1, name: "Requests" })).toBeVisible();
    await expect(page.getByText("No requests yet.")).toBeVisible();

    await page.goto("/dashboard/schedules");
    await expect(page.getByRole("heading", { level: 1, name: "Scheduled Tasks" })).toBeVisible();
    await expect(page.getByText("frontend")).toBeVisible();
  });
});
