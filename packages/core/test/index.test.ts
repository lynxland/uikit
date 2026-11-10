import { describe, expect, it } from "vitest";
import {
  ApiError,
  collectionSearch,
  collectionSource,
  createSubscriptionEngine,
  defineEntity,
  parseSearch,
  stringifySearch,
} from "../src";

describe("root entry", () => {
  it("re-exports kernel/schema/adapters without React or Effect", () => {
    expect(typeof collectionSearch).toBe("function");
    expect(typeof defineEntity).toBe("function");
    expect(typeof collectionSource).toBe("function");
    expect(typeof createSubscriptionEngine).toBe("function");
    expect(typeof parseSearch).toBe("function");
    expect(typeof stringifySearch).toBe("function");
    expect(new ApiError("network")).toBeInstanceOf(Error);
  });
});
