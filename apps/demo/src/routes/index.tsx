import { createFileRoute, redirect } from "@tanstack/react-router";

/** The demo has a single home: Dokploy's dashboard home. */
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/home" });
  },
});
