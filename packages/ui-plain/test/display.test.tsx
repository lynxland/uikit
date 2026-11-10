import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, Button, Card, icons, Table } from "../src";
import "./setup";

describe("display primitives", () => {
  it("renders badges with tone and variant", () => {
    render(
      <Badge tone="success" variant="outline">
        Healthy
      </Badge>,
    );
    const badge = screen.getByText("Healthy");
    expect(badge.className).toContain("ui-plain-badge--outline");
    expect(badge.getAttribute("data-tone")).toBe("success");
  });

  it("renders a card with header, actions and content", () => {
    render(
      <Card
        title="Widgets"
        description="All widgets in the current scope."
        actions={<Button>New</Button>}
      >
        <p>Card body</p>
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Widgets" })).toBeTruthy();
    expect(screen.getByText("All widgets in the current scope.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New" })).toBeTruthy();
    expect(screen.getByText("Card body")).toBeTruthy();
  });

  it("renders a header divider, body class and footer", () => {
    render(
      <Card
        title="Web Server"
        description="Reload or clean."
        headerDivider
        bodyClassName="custom-body"
        footer={<span>Footer note</span>}
      >
        <p>Card body</p>
      </Card>,
    );

    const header = screen.getByText("Web Server").closest("[data-slot='card-header']");
    expect(header?.className).toContain("ui-plain-card-header--divider");
    expect(header?.getAttribute("data-divider")).toBe("true");

    const body = screen.getByText("Card body").closest("[data-slot='card-content']");
    expect(body?.className).toContain("custom-body");
    expect(body?.className).not.toContain("ui-plain-card-content--with-header");

    const footer = screen.getByText("Footer note").closest("[data-slot='card-footer']");
    expect(footer?.className).toContain("ui-plain-card-footer");
  });

  it("renders table slots and inline icons", () => {
    render(
      <Table.Root>
        <Table.Caption>Widget inventory</Table.Caption>
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
    expect(screen.getByText("Widget inventory")).toBeTruthy();

    render(<icons.Loader aria-label="Loading" />);
    const icon = screen.getByLabelText("Loading");
    expect(icon.getAttribute("aria-hidden")).not.toBe("true");
  });
});
