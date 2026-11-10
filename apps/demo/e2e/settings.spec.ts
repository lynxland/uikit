import { expect, test } from "@playwright/test";

test.describe("Dokploy settings", () => {
  test("remote servers can be added and removed", async ({ page }) => {
    await page.goto("/dashboard/settings/servers");
    await expect(page.getByRole("heading", { level: 1, name: "Servers" })).toBeVisible();
    await expect(page.getByTestId("server-grid")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("add-server").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Name").fill("edge-e2e");
    await dialog.getByLabel("Host").fill("10.0.0.99");
    await dialog.getByRole("button", { name: "Add server" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const card = page.getByTestId("server-grid").locator("article").filter({ hasText: "edge-e2e" });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Remove server" }).click();
    await page.getByTestId("confirm-remove-server").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(card).toHaveCount(0);
  });

  test("SSH keys, Git providers and profile use the Dokploy card treatment", async ({ page }) => {
    await page.goto("/dashboard/settings/ssh-keys");
    await expect(page.getByRole("heading", { level: 1, name: "SSH Keys" })).toBeVisible();
    await expect(page.getByTestId("dokploy-page-card")).toBeVisible();
    await page.getByRole("button", { name: "Add SSH Key" }).click();
    await expect(page.getByTestId("ssh-message")).toContainText("placeholder");

    await page.goto("/dashboard/settings/git-providers");
    await expect(page.getByRole("heading", { level: 1, name: "Git Providers" })).toBeVisible();
    await page.getByRole("button", { name: "GitHub" }).click();
    await expect(page.getByTestId("git-message")).toContainText("placeholder");

    await page.goto("/dashboard/settings/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByTestId("profile-saved")).toContainText("saved locally");
    await expect(page.getByTestId("theme-toggle").first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Profile");
  });

  test("web server, users and notifications content is present", async ({ page }) => {
    await page.goto("/dashboard/settings/web-server");
    await expect(page.getByLabel("Let's Encrypt Email")).toHaveValue("siumauricio@hotmail.com");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Server domain saved.")).toBeVisible();

    await page.goto("/dashboard/settings/users");
    await expect(page.getByRole("heading", { level: 1, name: "Users" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "admin@dokploy.com (You)" })).toBeVisible();
    await expect(page.getByText("Invite users to your organization")).toBeVisible();

    await page.goto("/dashboard/settings/notifications");
    await expect(page.getByRole("heading", { level: 1, name: "Notifications" })).toBeVisible();
    await expect(page.getByText("dsfgdsfg")).toBeVisible();
  });
});
