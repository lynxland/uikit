import { expect, test } from "@playwright/test";

test.describe("Dokploy projects", () => {
  test("search, tag and sort filters round-trip through the URL", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
    const atlas = page.getByTestId("project-card-proj-atlas");
    await expect(atlas).toBeVisible({ timeout: 10_000 });
    await expect(atlas).toContainText("Atlas Platform");
    await expect(atlas).toContainText("Created");
    await expect(atlas).toContainText("services");

    await page.getByTestId("project-search").fill("Nova");
    await expect(page).toHaveURL(/q=Nova/);
    await expect(page.getByTestId("project-card-proj-nova")).toBeVisible();
    await expect(atlas).toHaveCount(0);

    await page.getByTestId("project-search").fill("");
    await page.getByTestId("project-tag-filter").click();
    await page.getByRole("menuitem", { name: "commerce" }).click();
    await expect(page).toHaveURL(/tag=commerce/);
    await expect(page.getByTestId("project-card-proj-nova")).toBeVisible();
    await expect(atlas).toHaveCount(0);

    await page.goto("/dashboard/projects");
    await page.getByLabel("Sort projects").click();
    await page.getByRole("option", { name: "Name (A-Z)" }).click();
    await expect(page).toHaveURL(/sort=name-asc/);
    await expect(page.getByTestId("project-grid").locator("article").first()).toContainText(
      "Atlas Platform",
    );

    await page.getByTestId("project-open-proj-atlas").click();
    await expect(page).toHaveURL(
      /\/dashboard\/project\/proj-atlas\/environment\/proj-atlas-production$/,
    );
    await expect(page.getByRole("heading", { level: 1, name: "Atlas Platform" })).toBeVisible();
  });

  test("create project, use the action menu, then delete with confirmation", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await expect(page.getByTestId("project-grid")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("create-project").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Project name").fill("Nebula E2E");
    await dialog.getByLabel("Description").fill("Created by the strict clone e2e suite");
    await dialog.getByLabel("Tags").fill("e2e, sandbox");
    await dialog.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const card = page
      .getByTestId("project-grid")
      .locator("article")
      .filter({ hasText: "Nebula E2E" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Created by the strict clone e2e suite");

    await card.getByRole("button", { name: /Actions for/ }).click();
    await page.getByRole("menuitem", { name: "Delete project" }).click();
    await expect(page.getByTestId("confirm-delete-project")).toBeVisible();
    await page.getByTestId("confirm-delete-project").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(card).toHaveCount(0);

    await page.getByTestId("project-actions-proj-atlas").click();
    await page.getByRole("menuitem", { name: "New application" }).click();
    await expect(page).toHaveURL(
      /\/dashboard\/project\/proj-atlas\/environment\/proj-atlas-production\/services\/application\/new$/,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "New application · Atlas Platform" }),
    ).toBeVisible();
  });
});
