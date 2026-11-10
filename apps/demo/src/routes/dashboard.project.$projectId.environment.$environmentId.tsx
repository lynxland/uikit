import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for an environment and its nested service routes. The environment
 * page itself is the index child; application pages render into the Outlet.
 */
export const Route = createFileRoute("/dashboard/project/$projectId/environment/$environmentId")({
  component: () => <Outlet />,
});
