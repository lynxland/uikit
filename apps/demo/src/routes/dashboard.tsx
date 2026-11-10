import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Shared `/dashboard` layout; each page owns its own data and chrome body. */
export const Route = createFileRoute("/dashboard")({
  component: () => <Outlet />,
});
