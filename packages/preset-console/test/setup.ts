/**
 * jsdom polyfills required by Base UI floating primitives (the default
 * `shadcnAdapter` used by `PresetProvider`). Imported for side effects by each
 * test file; also registers Testing Library cleanup.
 */
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom implements the method but logs "Not implemented"; Base UI calls it on
// focus moves inside portalled dialogs.
window.scrollTo = (() => {}) as typeof window.scrollTo;

if (typeof globalThis.requestAnimationFrame !== "function") {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number =>
    setTimeout(() => callback(Date.now()), 0) as unknown as number;
  globalThis.cancelAnimationFrame = (handle: number): void => {
    clearTimeout(handle);
  };
}
