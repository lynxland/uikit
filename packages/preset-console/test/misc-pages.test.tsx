import { renderWithKit } from "@lynxland/uikit-testing";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferenceItem, PresetProvider, SettingsPage, WizardPage, type WizardStep } from "../src";
import "./setup";

beforeEach(() => {
  window.localStorage.clear();
});

describe("SettingsPage", () => {
  it("renders sections and wires PreferenceItem to localStorage", async () => {
    renderWithKit(
      <PresetProvider>
        <SettingsPage
          title="Settings"
          description="Workspace preferences"
          sections={[
            {
              key: "general",
              title: "General",
              description: "Appearance",
              items: [
                {
                  key: "theme",
                  label: "Theme",
                  description: "Light or dark",
                  control: (
                    <PreferenceItem storageKey="preset.test.theme" fallback="light">
                      {({ value, setValue }) => (
                        <button
                          type="button"
                          onClick={() => setValue(value === "light" ? "dark" : "light")}
                        >
                          Theme: {value}
                        </button>
                      )}
                    </PreferenceItem>
                  ),
                },
              ],
            },
          ]}
        />
      </PresetProvider>,
      { path: "/" },
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeTruthy();
    expect(screen.getByText("General")).toBeTruthy();
    expect(screen.getByText("Light or dark")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Theme: light" }));
    expect(screen.getByRole("button", { name: "Theme: dark" })).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem("preset.test.theme") ?? "null")).toBe("dark");
  });

  it("renders free-form section content instead of the item list", async () => {
    renderWithKit(
      <PresetProvider>
        <SettingsPage
          title="Settings"
          sections={[
            {
              key: "danger",
              title: "Danger zone",
              content: (
                <div data-testid="free-form">
                  <button type="button">Delete workspace</button>
                </div>
              ),
            },
          ]}
        />
      </PresetProvider>,
      { path: "/" },
    );

    expect(await screen.findByTestId("free-form")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete workspace" })).toBeTruthy();
    expect(document.querySelector(".ui-settings-page__items")).toBeNull();
  });
});

const steps: WizardStep[] = [
  { key: "one", label: "One", render: () => <div>Step one</div> },
  { key: "two", label: "Two", render: () => <div>Step two</div> },
];

describe("WizardPage", () => {
  it("moves through uncontrolled steps", async () => {
    renderWithKit(
      <PresetProvider>
        <WizardPage title="Setup" steps={steps} />
      </PresetProvider>,
      { path: "/" },
    );

    expect(await screen.findByText("Step one")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step two")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Step one")).toBeTruthy();
  });

  it("reports controlled step changes without moving on its own", async () => {
    const onCurrentChange = vi.fn();
    renderWithKit(
      <PresetProvider>
        <WizardPage title="Setup" steps={steps} current={0} onCurrentChange={onCurrentChange} />
      </PresetProvider>,
      { path: "/" },
    );

    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(onCurrentChange).toHaveBeenCalledWith(1);
    expect(screen.getByText("Step one")).toBeTruthy();
  });
});
