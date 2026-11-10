import { mockSource, mockStream, renderWithKit } from "@lynxland/uikit-testing";
import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventsPage, PresetProvider } from "../src";
import "./setup";

interface EventFrame {
  id: string;
  message: string;
}

describe("EventsPage", () => {
  it("anchors the stream on the backlog tail and appends live frames", async () => {
    const backlog = mockSource<EventFrame>("event-log", [{ id: "1", message: "one" }]);
    const stream = mockStream<EventFrame>();

    renderWithKit(
      <PresetProvider>
        <EventsPage<EventFrame>
          title="Events"
          source={backlog.collection}
          stream={stream}
          request={{ window: { kind: "all" } }}
          getCursor={(frame) => frame.id}
          getKey={(frame) => frame.id}
          render={(frame) => <span>event:{frame.message}</span>}
          labels={{ feed: "Activity" }}
        />
      </PresetProvider>,
      { path: "/" },
    );

    expect(await screen.findByText("event:one")).toBeTruthy();
    await waitFor(() => expect(stream.opens).toHaveLength(1));
    expect(stream.opens[0]?.cursor).toBe("1");

    act(() => {
      stream.emit({ id: "2", message: "two" });
    });

    expect(await screen.findByText("event:two")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Events" })).toBeTruthy();
  });

  it("uses an explicit live-tail cursor when supplied", async () => {
    const backlog = mockSource<EventFrame>("event-log", []);
    const stream = mockStream<EventFrame>();

    renderWithKit(
      <PresetProvider>
        <EventsPage<EventFrame>
          title="Events"
          source={backlog.collection}
          stream={stream}
          cursor={null}
          getCursor={(frame) => frame.id}
          getKey={(frame) => frame.id}
          render={(frame) => <span>event:{frame.message}</span>}
        />
      </PresetProvider>,
      { path: "/" },
    );

    expect(await screen.findByText("No events yet")).toBeTruthy();
    await waitFor(() => expect(stream.opens).toHaveLength(1));
    expect(stream.opens[0]?.cursor).toBeNull();

    act(() => {
      stream.emit({ id: "1", message: "live" });
    });
    expect(await screen.findByText("event:live")).toBeTruthy();
  });
});
