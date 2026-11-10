import { expect, test } from "@playwright/test";

const APP_URL =
  "/dashboard/project/proj-atlas/environment/proj-atlas-production/services/application/app-atlas-api";

test.describe("Dokploy application detail", () => {
  test("header, tabs, secret reveal, logs and monitoring work", async ({ page }) => {
    await page.goto(APP_URL);
    await expect(page.getByRole("heading", { level: 1, name: "api" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Dokploy Server")).toBeVisible();
    await expect(page.getByRole("tab", { name: "General" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByLabel("Repository URL")).toHaveValue(
      "https://github.com/getatlas/api.git",
    );
    await expect(page.getByText("railpack", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Environment" }).click();
    await expect(page).toHaveURL(/tab=environment/);
    const editor = page.getByRole("textbox", { name: "Environment variables" });
    await expect(editor).toHaveAttribute("data-masked", "true");
    await expect(editor).toHaveValue(/DATABASE_URL=postgres:\/\/atlas/);
    await expect(editor).toHaveCSS("-webkit-text-security", "disc");
    await page.getByTestId("env-reveal").click();
    await expect(editor).not.toHaveAttribute("data-masked", "true");
    await expect(editor).toHaveValue(/DATABASE_URL=postgres:\/\/atlas/);

    await page.getByRole("tab", { name: "Domains" }).click();
    await expect(page).toHaveURL(/tab=domains/);
    await expect(page.getByText("api.atlas.example.com").first()).toBeVisible();

    await page.getByRole("tab", { name: "Deployments", exact: true }).click();
    await expect(page).toHaveURL(/tab=deployments/);
    await expect(page.getByTestId(/^deployment-logs-/).first()).toBeVisible();
    await page
      .getByTestId(/^deployment-logs-/)
      .first()
      .click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId("log-status")).toContainText("live", { timeout: 10_000 });
    await drawer.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("tab", { name: "Logs" }).click();
    await expect(page).toHaveURL(/tab=logs/);
    await expect
      .poll(async () => page.getByTestId("log-viewer").locator("[data-line]").count(), {
        timeout: 10_000,
      })
      .toBeGreaterThanOrEqual(24);
    await expect(page.getByTestId("log-toolbar")).toBeVisible();
    await expect(page.getByTestId("log-status")).toContainText("live");
    await expect(page.getByLabel("Search logs")).toBeVisible();
    await page.getByTestId("log-pause").click();
    await expect(page.getByTestId("log-status")).toContainText("paused");
    await page.getByTestId("log-pause").click();
    await expect(page.getByTestId("log-status")).toContainText("live");

    await page.getByRole("tab", { name: "Monitoring" }).click();
    await expect(page.getByTestId("metric-chart")).toHaveCount(4);

    await page.getByRole("tab", { name: "Advanced" }).click();
    await page.getByLabel("Command", { exact: true }).fill("node dist/worker.js");
    await page.getByRole("button", { name: "Save command" }).click();
    await expect(page.getByTestId("advanced-saved")).toContainText("Saved command locally");

    await page.getByRole("button", { name: "Edit application" }).click();
    const editDrawer = page.getByRole("dialog");
    await expect(editDrawer).toBeVisible();
    await expect(editDrawer.getByLabel("Service name")).toHaveValue("api");
    await editDrawer.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
