import type { StreamState } from "@lynxland/uikit-core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import {
  EventFeed,
  LogViewer,
  type StageEvent,
  StageTimeline,
  type StreamViewSource,
} from "../src/views";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

interface FakeStream<F> extends StreamViewSource<F> {
  push(frame: F): void;
}

function createStream<F>(): FakeStream<F> {
  let frames: readonly F[] = [];
  let state: StreamState = { status: "live", error: null, resyncs: 0 };
  const frameListeners = new Set<() => void>();
  const statusListeners = new Set<() => void>();

  const notifyFrames = () => {
    for (const listener of frameListeners) listener();
  };
  const notifyStatus = () => {
    for (const listener of statusListeners) listener();
  };
  const patch = (next: Partial<StreamState>) => {
    state = { ...state, ...next };
    notifyStatus();
  };

  return {
    get frames() {
      return frames;
    },
    get status() {
      return state.status;
    },
    get error() {
      return state.error;
    },
    get resyncs() {
      return state.resyncs;
    },
    push(frame) {
      frames = [...frames, frame];
      notifyFrames();
    },
    pause() {
      patch({ status: "paused" });
    },
    resume() {
      patch({ status: "live" });
    },
    restart() {},
    resync() {},
    clear() {
      frames = [];
      notifyFrames();
    },
    subscribeFrames(listener) {
      frameListeners.add(listener);
      return () => {
        frameListeners.delete(listener);
      };
    },
    getFrames() {
      return frames;
    },
    subscribeStatus(listener) {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },
    getState() {
      return state;
    },
  };
}

function withAdapter(node: ReactNode) {
  return <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>;
}

describe("LogViewer", () => {
  it("renders only the newest N frames and follows pause/clear", () => {
    const stream = createStream<number>();
    render(
      withAdapter(<LogViewer stream={stream} limit={3} formatLine={(frame) => `line ${frame}`} />),
    );
    expect(screen.getByText("Waiting for frames…")).toBeTruthy();

    act(() => {
      for (let frame = 1; frame <= 5; frame += 1) stream.push(frame);
    });

    expect(screen.queryByText("line 1")).toBeNull();
    expect(screen.queryByText("line 2")).toBeNull();
    expect(screen.getByText("line 3")).toBeTruthy();
    expect(screen.getByText("line 5")).toBeTruthy();
    expect(screen.getByTestId("log-count").textContent).toBe("3 / 5 lines");

    fireEvent.click(screen.getByTestId("log-pause"));
    expect(stream.status).toBe("paused");
    expect(screen.getByTestId("log-pause").textContent).toBe("Resume");

    fireEvent.click(screen.getByTestId("log-clear"));
    expect(screen.getByText("Waiting for frames…")).toBeTruthy();
  });

  it("renders arbitrary React per line through renderLine", () => {
    const stream = createStream<number>();
    act(() => {
      stream.push(1);
      stream.push(2);
      stream.push(3);
    });
    render(
      withAdapter(
        <LogViewer
          stream={stream}
          limit={2}
          formatLine={(frame) => `plain ${frame}`}
          renderLine={(frame, index) => (
            <span data-testid={`rich-${frame}`}>
              #{index} line {frame}
            </span>
          )}
        />,
      ),
    );

    expect(screen.getByTestId("rich-2").textContent).toBe("#1 line 2");
    expect(screen.getByTestId("rich-3").textContent).toBe("#2 line 3");
    expect(screen.queryByText("plain 2")).toBeNull();
  });

  it("renders a toolbar while keeping the built-in pause/clear controls", () => {
    const stream = createStream<number>();
    act(() => {
      stream.push(1);
    });
    render(
      withAdapter(
        <LogViewer
          stream={stream}
          toolbar={
            <button type="button" data-testid="custom-action">
              Search
            </button>
          }
        />,
      ),
    );

    expect(screen.getByTestId("log-toolbar").textContent).toContain("Search");
    expect(screen.getByTestId("custom-action")).toBeTruthy();
    expect(screen.getByTestId("log-status")).toBeTruthy();
    fireEvent.click(screen.getByTestId("log-pause"));
    expect(stream.status).toBe("paused");
    expect(screen.getByTestId("log-pause").textContent).toBe("Resume");
    fireEvent.click(screen.getByTestId("log-clear"));
    expect(screen.getByText("Waiting for frames…")).toBeTruthy();
  });

  it("hides the built-in header and toolbar when hideHeader is set", () => {
    const stream = createStream<number>();
    act(() => {
      stream.push(7);
    });
    render(
      withAdapter(
        <LogViewer
          stream={stream}
          hideHeader
          title="Hidden title"
          toolbar={<span>hidden toolbar</span>}
          formatLine={(frame) => `line ${frame}`}
        />,
      ),
    );

    expect(screen.queryByTestId("log-status")).toBeNull();
    expect(screen.queryByTestId("log-pause")).toBeNull();
    expect(screen.queryByTestId("log-toolbar")).toBeNull();
    expect(screen.queryByText("Hidden title")).toBeNull();
    expect(screen.getByText("line 7")).toBeTruthy();
  });

  it("downloads the same bounded window through formatLine", () => {
    const stream = createStream<number>();
    act(() => {
      stream.push(1);
      stream.push(2);
      stream.push(3);
    });
    const createObjectURL = vi.fn(() => "blob:logs");
    const revokeObjectURL = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    try {
      render(
        withAdapter(
          <LogViewer
            stream={stream}
            limit={2}
            formatLine={(frame) => `line ${frame}`}
            downloadFileName="logs.txt"
          />,
        ),
      );
      fireEvent.click(screen.getByTestId("log-download"));
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:logs");
      expect(click).toHaveBeenCalledTimes(1);
    } finally {
      click.mockRestore();
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});

describe("EventFeed", () => {
  it("shows newest first with a bounded frame window", () => {
    const stream = createStream<number>();
    act(() => {
      stream.push(1);
      stream.push(2);
      stream.push(3);
    });
    render(
      withAdapter(
        <EventFeed
          stream={stream}
          getKey={(frame) => frame}
          render={(frame) => <span>Event {frame}</span>}
          limit={2}
        />,
      ),
    );

    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual(["Event 3", "Event 2"]);
  });

  it("merges backlog and live frames by key and reports pause", () => {
    const stream = createStream<number>();
    act(() => {
      stream.push(3);
    });
    render(
      withAdapter(
        <EventFeed
          stream={stream}
          backlog={[1, 2, 3]}
          getKey={(frame) => frame}
          render={(frame) => <span>Event {frame}</span>}
        />,
      ),
    );

    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual(["Event 3", "Event 2", "Event 1"]);

    fireEvent.click(screen.getByTestId("event-feed-pause"));
    expect(stream.status).toBe("paused");
    expect(screen.getByTestId("event-feed-paused")).toBeTruthy();
    expect(screen.getByTestId("event-feed-pause").textContent).toBe("Resume");
  });
});

describe("StageTimeline", () => {
  interface Frame {
    stage: string;
    status: StageEvent["status"];
    at: string;
  }

  const stages = [
    { key: "build", label: "Build" },
    { key: "deploy", label: "Deploy" },
  ];

  const project = (frame: Frame): StageEvent => ({
    key: frame.stage,
    status: frame.status,
    at: frame.at,
  });

  it("folds frames into stage state with elapsed time", () => {
    const stream = createStream<Frame>();
    const { container } = render(
      withAdapter(<StageTimeline stream={stream} stages={stages} onStage={project} tickMs={0} />),
    );

    act(() => {
      stream.push({ stage: "build", status: "active", at: "2026-01-01T00:00:00Z" });
      stream.push({ stage: "build", status: "done", at: "2026-01-01T00:00:05Z" });
      stream.push({ stage: "deploy", status: "failed", at: "2026-01-01T00:00:07Z" });
    });

    expect(container.querySelector('[data-stage="build"]')?.getAttribute("data-stage-status")).toBe(
      "done",
    );
    expect(
      container.querySelector('[data-stage="deploy"]')?.getAttribute("data-stage-status"),
    ).toBe("failed");
    expect(screen.getByText("Build")).toBeTruthy();
    expect(screen.getByText("5s")).toBeTruthy();
  });

  it("clears back to pending", () => {
    const stream = createStream<Frame>();
    const { container } = render(
      withAdapter(<StageTimeline stream={stream} stages={stages} onStage={project} tickMs={0} />),
    );
    act(() => {
      stream.push({ stage: "build", status: "done", at: "2026-01-01T00:00:00Z" });
    });
    expect(container.querySelector('[data-stage="build"]')?.getAttribute("data-stage-status")).toBe(
      "done",
    );

    fireEvent.click(screen.getByTestId("stage-timeline-clear"));
    expect(container.querySelector('[data-stage="build"]')?.getAttribute("data-stage-status")).toBe(
      "pending",
    );
  });
});
