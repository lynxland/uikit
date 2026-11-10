import { createFileRoute } from "@tanstack/react-router";
import {
  DokployProjectsPage,
  PROJECT_SORT_OPTIONS,
  type ProjectSort,
} from "@/features/dokploy/projects";

const SORT_VALUES = new Set<string>(PROJECT_SORT_OPTIONS.map((option) => option.value));

function normalizeProjectSearch(search: Record<string, unknown>): {
  q?: string;
  tag?: string;
  status?: "active" | "archived";
  sort?: ProjectSort;
} {
  const q = typeof search.q === "string" && search.q.trim() !== "" ? search.q : undefined;
  const tag = typeof search.tag === "string" && search.tag !== "" ? search.tag : undefined;
  const status =
    search.status === "active" || search.status === "archived" ? search.status : undefined;
  const sort =
    typeof search.sort === "string" && SORT_VALUES.has(search.sort)
      ? (search.sort as ProjectSort)
      : undefined;
  return {
    ...(q !== undefined ? { q } : {}),
    ...(tag !== undefined ? { tag } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(sort !== undefined ? { sort } : {}),
  };
}

export const Route = createFileRoute("/dashboard/projects/")({
  validateSearch: normalizeProjectSearch,
  component: ProjectsRoute,
});

function ProjectsRoute() {
  return <DokployProjectsPage from={Route.id} />;
}
