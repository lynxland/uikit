import { expect, test } from "@playwright/test";

const ATLAS_PRODUCTION = "/dashboard/project/proj-atlas/environment/proj-atlas-production";

test.describe("Dokploy project environment", () => {
  test("environment switcher is URL-backed and services share one grid", async ({ page }) => {
    await page.goto(ATLAS_PRODUCTION);
    await expect(page.getByRole("heading", { level: 1, name: "Atlas Platform" })).toBeVisible();
    await expect(page.getByTestId("environment-switcher")).toContainText("production");
    await expect(page.getByTestId("service-card-app-atlas-api")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("service-card-db-atlas-postgres")).toBeVisible();
    await expect(page.getByTestId("service-card-compose-atlas-observability")).toBeVisible();
    await expect(page.getByTestId("service-card-app-atlas-api")).toContainText("Created");

    await page.getByTestId("environment-switcher").click();
    await page.getByRole("menuitem", { name: "Staging" }).click();
    await expect(page).toHaveURL(/\/environment\/proj-atlas-staging$/);
    await expect(page.getByTestId("service-card-app-atlas-api-staging")).toBeVisible();
    await expect(page.getByTestId("service-card-app-atlas-api")).toHaveCount(0);

    await page.getByTestId("service-search").fill("api");
    await expect(page.getByTestId("service-card-app-atlas-api-staging")).toBeVisible();
    await expect(page.getByTestId("service-card-db-atlas-postgres-staging")).toHaveCount(0);
    await page.getByTestId("service-search").fill("");

    await page.getByTestId("service-open-app-atlas-api-staging").click();
    await expect(page).toHaveURL(
      /\/dashboard\/project\/proj-atlas\/environment\/proj-atlas-staging\/services\/application\/app-atlas-api-staging$/,
    );
    await expect(page.getByRole("heading", { level: 1, name: "api-staging" })).toBeVisible();
  });

  test("create an application from the dialog, then delete it", async ({ page }) => {
    await page.goto(ATLAS_PRODUCTION);
    await expect(page.getByTestId("service-card-app-atlas-api")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("create-application").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Service name").fill("dialog-e2e");
    await dialog.getByLabel("Repository").fill("getatlas/dialog-e2e");
    await dialog.getByRole("button", { name: "Create application" }).click();

    await expect(page).toHaveURL(/\/services\/application\/app-dialog-e2e-/);
    await expect(page.getByRole("heading", { level: 1, name: "dialog-e2e" })).toBeVisible();

    await page.getByTestId("delete-application").click();
    await expect(page.getByTestId("confirm-delete-application")).toBeVisible();
    await page.getByTestId("confirm-delete-application").click();
    await expect(page).toHaveURL(/\/environment\/proj-atlas-production$/);
    await expect(page.getByText("dialog-e2e")).toHaveCount(0);
  });

  test("create an application through the route page", async ({ page }) => {
    await page.goto(
      "/dashboard/project/proj-nova/environment/proj-nova-production/services/application/new",
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "New application · Nova Commerce" }),
    ).toBeVisible();
    await page.getByLabel("Service name").fill("page-e2e");
    await page.getByLabel("Repository").fill("novacom/page-e2e");
    await page.getByRole("button", { name: "Create application" }).click();
    await expect(page).toHaveURL(/\/services\/application\/app-page-e2e-/);
    await expect(page.getByRole("heading", { level: 1, name: "page-e2e" })).toBeVisible();
  });
});
