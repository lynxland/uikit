import test from "node:test";
import assert from "node:assert/strict";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { parseSearch, stringifySearch } from "../dist/url-serializer.js";

function makeRouter(initialEntries) {
  const rootRoute = createRootRoute();
  const widgetsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/widgets",
  });
  const routeTree = rootRoute.addChildren([widgetsRoute]);
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries }),
    parseSearch,
    stringifySearch,
  });
}

test("tanstack router: custom parseSearch/stringifySearch roundtrip", async () => {
  const router = makeRouter([
    "/widgets?widgets.filter=status%3Aeq%3Arunning&tab=settings",
  ]);
  await router.load();

  const search = router.state.location.search;
  assert.equal(search["widgets.filter"], "status:eq:running");
  assert.equal(search.tab, "settings");

  const location = router.buildLocation({
    to: "/widgets",
    search: {
      "widgets.filter": ["status:eq:running", "replicas:gte:2"],
      tab: "settings",
    },
  });

  assert.match(location.href, /widgets\.filter=status%3Aeq%3Arunning/);
  assert.match(location.href, /widgets\.filter=replicas%3Agte%3A2/);
  assert.match(location.href, /tab=settings/);
  assert.deepEqual(location.search["widgets.filter"], [
    "status:eq:running",
    "replicas:gte:2",
  ]);
});
