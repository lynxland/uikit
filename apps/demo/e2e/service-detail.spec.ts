import { expect, test } from "@playwright/test";

const ATLAS_PRODUCTION = "/dashboard/project/proj-atlas/environment/proj-atlas-production";

test.describe("Dokploy database/compose detail", () => {
  test("postgres card opens credentials, tabs and masked secrets", async ({ page }) => {
    await page.goto(ATLAS_PRODUCTION);
    await expect(page.getByTestId("service-card-db-atlas-postgres")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId("service-open-db-atlas-postgres").click();
    await expect(page).toHaveURL(/\/services\/postgres\/db-atlas-postgres$/);
    await expect(page.getByRole("heading", { level: 1, name: "postgres" })).toBeVisible();
    await expect(page.getByText("Internal Credentials")).toBeVisible();
    await expect(page.getByLabel("User", { exact: true })).toHaveValue("postgres");
    await expect(page.getByRole("textbox", { name: "Internal Port (Container)" })).toHaveValue(
      "5432",
    );

    const password = page.getByTestId("internal-password");
    await expect(password).toHaveValue(/••••/);
    await page.getByRole("button", { name: "Reveal Password" }).click();
    await expect(password).toHaveValue(/dokploy_postgres_/);

    await page.getByRole("tab", { name: "Environment" }).click();
    await expect(page).toHaveURL(/tab=environment/);
    await expect(page.getByRole("textbox", { name: "Environment variables" })).toBeVisible();

    await page.getByRole("tab", { name: "Logs" }).click();
    await expect(page.getByTestId("log-viewer")).toBeVisible();
  });

  test("compose card opens the compose file screen", async ({ page }) => {
    await page.goto(ATLAS_PRODUCTION);
    await expect(page.getByTestId("service-card-compose-atlas-observability")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId("service-open-compose-atlas-observability").click();
    await expect(page).toHaveURL(/\/services\/compose\/compose-atlas-observability$/);
    await expect(page.getByText("Compose File")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Backups" })).toHaveCount(0);
  });
});
