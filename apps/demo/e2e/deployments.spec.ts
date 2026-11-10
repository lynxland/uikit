import { expect, test } from "@playwright/test";

test.describe("Dokploy deployments", () => {
  test("status filter and pagination are URL-backed; logs open in a drawer", async ({ page }) => {
    await page.goto("/dashboard/deployments");
    await expect(page.getByRole("heading", { level: 1, name: "Deployments" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("row").nth(1)).toContainText("dpl-");

    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole("row").nth(1)).toContainText("dpl-");
    await page.getByRole("button", { name: "Previous page" }).click();
    await expect(page).not.toHaveURL(/page=2/);

    await page.getByTestId("filter-enum-status").click();
    await page.getByRole("checkbox", { name: "Failed" }).check();
    await expect(page).toHaveURL(/filter=status%3Ain%3Afailed/);
    await expect(page.getByRole("row").nth(1)).toContainText(/failed/i);

    await page
      .getByTestId(/^deploy-row-logs-/)
      .first()
      .click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId("log-status")).toContainText("live", { timeout: 10_000 });
    await expect(drawer.getByTestId("log-viewer")).toBeVisible();
    await drawer.getByTestId("log-pause").click();
    await expect(drawer.getByTestId("log-status")).toContainText("paused");
    await drawer.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
