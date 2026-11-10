import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, Button, Card, Field, Input, Table } from "../src";
import "./setup";

describe("Badge", () => {
  it("maps tones and variants to status tokens", () => {
    render(
      <div>
        <Badge tone="success" variant="soft">
          Healthy
        </Badge>
        <Badge tone="warning" variant="outline">
          Degraded
        </Badge>
        <Badge tone="danger" variant="solid">
          Down
        </Badge>
        <Badge>Neutral</Badge>
      </div>,
    );

    const success = screen.getByText("Healthy");
    expect(success.getAttribute("data-tone")).toBe("success");
    expect(success.getAttribute("data-variant")).toBe("soft");
    expect(success.className).toContain("--status-success");

    const warning = screen.getByText("Degraded");
    expect(warning.className).toContain("--status-warning");
    expect(warning.className).toContain("border-[var(--status-warning)]");

    const danger = screen.getByText("Down");
    expect(danger.className).toContain("bg-[var(--status-danger)]");

    expect(screen.getByText("Neutral").getAttribute("data-tone")).toBe("neutral");
  });
});

describe("Card", () => {
  it("renders header, description, actions and children", () => {
    render(
      <Card
        title="Widgets"
        description="Manage registered widgets."
        actions={<Button size="sm">Create</Button>}
      >
        <p>Card body</p>
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Widgets" })).toBeTruthy();
    expect(screen.getByText("Manage registered widgets.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create" })).toBeTruthy();
    expect(screen.getByText("Card body")).toBeTruthy();
  });
});

describe("Field", () => {
  it("associates a label with its control and shows description", () => {
    render(
      <Field htmlFor="email" label="Email" description="Used for alerts." required>
        <Input id="email" />
      </Field>,
    );

    expect(screen.getByRole("textbox", { name: "Email" })).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByText("Used for alerts.").getAttribute("data-slot")).toBe(
      "field-description",
    );
  });

  it("prefers the error message over the description", () => {
    render(
      <Field htmlFor="email" label="Email" description="Used for alerts." error="Required">
        <Input id="email" />
      </Field>,
    );

    const error = screen.getByText("Required");
    expect(error.getAttribute("data-slot")).toBe("field-error");
    expect(screen.queryByText("Used for alerts.")).toBeNull();
  });
});

describe("Table", () => {
  it("renders the styled slots", () => {
    render(
      <Table.Root>
        <Table.Caption>Widget counts</Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.Head>Name</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Alpha</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>,
    );

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Alpha" })).toBeTruthy();
    expect(screen.getByText("Widget counts")).toBeTruthy();
  });
});
