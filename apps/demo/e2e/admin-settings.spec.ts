import { expect, test } from "@playwright/test";

test.describe("Dokploy admin settings", () => {
  test("audit logs filter, sort, date-range and hide columns", async ({ page }) => {
    await page.goto("/dashboard/settings/audit-logs");
    await expect(page.getByRole("heading", { level: 1, name: "Audit Logs" })).toBeVisible();
    await expect(page.getByTestId("audit-logs-page")).toBeVisible();
    await expect(page.getByRole("table", { name: "Audit logs" })).toBeVisible();
    await expect(page.getByTestId(/^audit-row-/)).toHaveCount(12);
    await expect(page.getByTestId("audit-row-audit-07")).toContainText("sarah@dokploy.com");

    await page.getByTestId("audit-user-filter").fill("sarah");
    await expect(page.getByTestId(/^audit-row-/)).toHaveCount(1);
    await expect(page.getByTestId("audit-row-audit-07")).toBeVisible();

    await page.getByTestId("audit-user-filter").fill("");
    await page.getByTestId("audit-name-filter").fill("shop");
    await expect(page.getByTestId(/^audit-row-/)).toHaveCount(1);
    await expect(page.getByTestId("audit-row-audit-07")).toBeVisible();

    await page.getByTestId("audit-name-filter").fill("");
    await page.getByLabel("Action").click();
    await page.getByRole("option", { name: "Create" }).click();
    await expect(page.getByTestId(/^audit-row-/)).toHaveCount(2);

    await page.getByLabel("Action").click();
    await page.getByRole("option", { name: "All actions" }).click();
    await page.getByLabel("Resource").click();
    await page.getByRole("option", { name: "User" }).click();
    await expect(page.getByTestId(/^audit-row-/)).toHaveCount(1);
    await expect(page.getByTestId("audit-row-audit-11")).toContainText("sarah@dokploy.com");

    await page.getByLabel("Resource").click();
    await page.getByRole("option", { name: "All resources" }).click();
    await page.getByTestId("date-range-picker").click();
    await page.getByTestId("date-range-start").fill("2026-07-06");
    await page.getByTestId("date-range-end").fill("2026-07-06");
    await expect(page.getByTestId(/^audit-row-/)).toHaveCount(7);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByTestId(/^audit-row-/)).toHaveCount(12);

    await expect(page.getByRole("columnheader", { name: /Metadata/ })).toBeVisible();
    await page.getByTestId("columns-picker").click();
    await expect(page.getByTestId("column-toggle-date")).toBeDisabled();
    await page.getByTestId("column-toggle-metadata").click();
    await expect(page.getByRole("columnheader", { name: /Metadata/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("columnheader", { name: /Role/ })).toBeVisible();
  });

  test("AI, certificates, registry, S3 and license pages act locally", async ({ page }) => {
    await page.goto("/dashboard/settings/ai");
    await expect(page.getByRole("heading", { level: 1, name: "AI Settings" })).toBeVisible();
    await expect(page.getByTestId("ai-row-ai-openrouter")).toContainText("OpenRouter");
    await expect(page.getByTestId("ai-row-ai-openrouter")).toContainText(
      "google/gemini-3-flash-preview",
    );
    await page.getByTestId("add-ai").click();
    await expect(page.getByTestId("ai-row-ai-openai")).toContainText("gpt-5.1-mini");
    await expect(page.getByTestId("toast-viewport")).toContainText(
      "OpenAI added locally — no command was issued.",
    );
    await page.getByRole("button", { name: "Delete OpenAI" }).click();
    await expect(page.getByTestId("ai-row-ai-openai")).toHaveCount(0);
    await page.getByRole("button", { name: "Edit OpenRouter" }).click();
    await expect(page.getByTestId("toast-viewport")).toContainText(
      "Editing AI providers is a demo placeholder.",
    );

    await page.goto("/dashboard/settings/certificates");
    await expect(page.getByRole("heading", { level: 1, name: "Certificates" })).toBeVisible();
    await expect(page.getByTestId("certificates-page")).toContainText(
      "Using invalid certificates can break your Traefik instance",
    );
    await expect(page.getByText("You don't have any certificates created")).toBeVisible();
    await page.getByTestId("add-certificate").click();
    await expect(page.getByTestId("toast-viewport")).toContainText(
      "Certificate creation is a demo placeholder.",
    );

    await page.goto("/dashboard/settings/registry");
    await expect(page.getByRole("heading", { level: 1, name: "Docker Registry" })).toBeVisible();
    await expect(page.getByTestId("registry-row-registry-ecr")).toContainText(
      "06079591900.dkr.ecr.us-east-1.amazonaws.com",
    );
    await page.getByTestId("add-registry").click();
    await expect(page.getByTestId("registry-row-registry-ghcr")).toContainText("ghcr.io");
    await page.getByRole("button", { name: "Delete GitHub Container Registry" }).click();
    await expect(page.getByTestId("registry-row-registry-ghcr")).toHaveCount(0);

    await page.goto("/dashboard/settings/s3-destinations");
    await expect(page.getByRole("heading", { level: 1, name: "S3 Destinations" })).toBeVisible();
    await expect(page.getByTestId("s3-row-s3-backups")).toContainText("7/6/2026");
    await page.getByTestId("add-s3-destination").click();
    await expect(page.getByTestId("s3-row-s3-eu")).toContainText("Backups EU");
    await page.getByRole("button", { name: "Delete Backups EU" }).click();
    await expect(page.getByTestId("s3-row-s3-eu")).toHaveCount(0);

    await page.goto("/dashboard/settings/license");
    await expect(page.getByRole("heading", { level: 1, name: "License Key" })).toBeVisible();
    await expect(page.getByTestId("license-key-input")).toHaveValue(
      "LIC-XXXXXXXX-XXXXXXXX-XXXXXXXX",
    );
    const licenseSwitch = page.getByRole("switch", { name: "License enabled" });
    await expect(licenseSwitch).toBeChecked();
    await page.getByTestId("deactivate-license").click();
    await expect(licenseSwitch).not.toBeChecked();
    await expect(page.getByTestId("license-key-input")).toBeDisabled();
    await page.getByTestId("validate-license").click();
    await expect(page.getByTestId("toast-viewport")).toContainText(
      "License validation is a demo placeholder.",
    );
  });

  test("palette-only settings are reachable from the command palette", async ({ page }) => {
    await page.goto("/dashboard/home");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();

    await page.keyboard.press("Control+k");
    const input = page.getByTestId("command-input");
    await expect(input).toBeVisible();
    await input.fill("certificates");
    await page.getByTestId("command-item-/dashboard/settings/certificates").click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/certificates$/);
    await expect(page.getByRole("heading", { level: 1, name: "Certificates" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
      "Certificates",
    );

    await page.keyboard.press("Control+k");
    await page.getByTestId("command-input").fill("license");
    await page.getByTestId("command-item-/dashboard/settings/license").click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/license$/);
    await expect(page.getByRole("heading", { level: 1, name: "License Key" })).toBeVisible();
  });
});
