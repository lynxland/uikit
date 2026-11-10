import { lookupSource } from "@lynxland/uikit-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { type FieldReference, ReferenceInput, ReferenceValue } from "../src/fields";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

interface Owner {
  id: string;
  name: string;
}

const owners = lookupSource<Owner, string>({
  name: "owners",
  read: async (ids) =>
    ids
      .filter((id) => id === "1" || id === "2")
      .map((id) => ({
        id,
        name: `Owner ${id}`,
      })),
});

const reference: FieldReference = {
  source: owners,
  getLabel: (row: Owner) => row.name,
  getValue: (row: Owner) => row.id,
};

function withProviders(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  });
  return (
    <QueryClientProvider client={client}>
      <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>
    </QueryClientProvider>
  );
}

describe("ReferenceValue", () => {
  it("resolves ids through useLookup and falls back to the raw id", async () => {
    render(withProviders(<ReferenceValue reference={reference} ids={["1", "missing"]} />));
    expect(await screen.findByText("Owner 1")).toBeTruthy();
    expect(screen.getByText("missing")).toBeTruthy();
  });
});

describe("ReferenceInput", () => {
  it("resolves the selected label and merges caller-provided options", async () => {
    render(
      withProviders(
        <ReferenceInput
          reference={reference}
          value="1"
          options={[{ value: "2", label: "Owner 2" }]}
          onChange={() => undefined}
          aria-label="Owner"
        />,
      ),
    );
    expect(await screen.findByText("Owner 1")).toBeTruthy();
    expect(screen.getByText("Owner 2")).toBeTruthy();
    expect((screen.getByLabelText("Owner") as HTMLSelectElement).value).toBe("1");
  });
});
