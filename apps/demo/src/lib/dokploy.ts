import {
  type Command,
  collectionSearch,
  defineEntity,
  invalidate,
  ok,
  rejected,
  type StreamSource,
} from "@lynxland/uikit-core";
import { mockCollection, mockTransport } from "@lynxland/uikit-core/adapters";
import type { MetricSeries } from "@lynxland/uikit-surfaces";

/**
 * Dokploy dogfood data layer.
 *
 * Reads are core adapters (`mockCollection` → collection/record/lookup), writes
 * are `Command`s returning `Outcome`. Cross-entity invalidation is explicit
 * `Effect[]`; there is no hidden store or Router dependency in this module.
 */

const NOW = Date.now();

function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60_000).toISOString();
}

function daysAgo(days: number): string {
  return minutesAgo(days * 24 * 60);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ============ types ============

export type ProjectStatus = "active" | "archived";
export type EnvironmentName = "production" | "staging";
export type ServiceKind = "application" | "postgres" | "redis" | "compose";
export type ServiceStatus = "running" | "stopped" | "deploying" | "idle" | "error";
export type DeploymentStatus = "success" | "failed" | "running" | "queued" | "cancelled";
export type DeploymentTrigger = "manual" | "git" | "schedule" | "rollback";
export type CertificateStatus = "active" | "pending" | "expired" | "none";
export type ServerStatus = "online" | "offline" | "maintenance";

export interface Project {
  id: string;
  name: string;
  description: string;
  tags: readonly string[];
  status: ProjectStatus;
  createdAt: string;
  lastDeployAt?: string;
}

export interface Environment {
  id: string;
  projectId: string;
  name: EnvironmentName;
  branch: string;
}

export interface ApplicationDetail {
  repo: string;
  branch: string;
  provider: "github" | "gitlab" | "gitea";
  buildType: "dockerfile" | "railpack" | "nixpacks" | "static";
  buildPath: string;
  dockerfile: string;
  port: number;
  runtime: "node" | "bun" | "deno" | "python" | "go" | "static";
  replicas: number;
  cpuLimit: number;
  memoryLimitMb: number;
  autoDeploy: boolean;
  previewDeployments: boolean;
  command: string;
  args: string;
  healthcheckPath: string;
  watchPaths: readonly string[];
}

export interface Service {
  id: string;
  projectId: string;
  environmentId: string;
  name: string;
  kind: ServiceKind;
  status: ServiceStatus;
  description: string;
  serverId: string;
  createdAt: string;
  lastDeployAt?: string;
  application?: ApplicationDetail;
}

export interface Deployment {
  id: string;
  projectId: string;
  serviceId: string;
  serviceName: string;
  environment: EnvironmentName;
  status: DeploymentStatus;
  commit: string;
  commitMessage: string;
  branch: string;
  author: string;
  trigger: DeploymentTrigger;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  server: string;
}

export interface Domain {
  id: string;
  serviceId: string;
  host: string;
  path: string;
  port: number;
  https: boolean;
  certificate: CertificateStatus;
  status: "active" | "pending" | "error";
}

export interface EnvVar {
  id: string;
  serviceId: string;
  key: string;
  value: string;
  secret: boolean;
  updatedAt: string;
}

export interface Server {
  id: string;
  name: string;
  host: string;
  region: string;
  status: ServerStatus;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  services: number;
  version: string;
  createdAt: string;
  lastSeenAt: string;
}

// ============ projects ============

export const PROJECTS: readonly Project[] = [
  {
    id: "proj-atlas",
    name: "Atlas Platform",
    description: "Customer-facing API, dashboard and observability stack.",
    tags: ["platform", "production"],
    status: "active",
    createdAt: daysAgo(184),
    lastDeployAt: minutesAgo(26),
  },
  {
    id: "proj-nova",
    name: "Nova Commerce",
    description: "Storefront, admin console and checkout services.",
    tags: ["commerce", "team-growth"],
    status: "active",
    createdAt: daysAgo(121),
    lastDeployAt: minutesAgo(74),
  },
  {
    id: "proj-orbit",
    name: "Orbit Analytics",
    description: "Ingestion pipeline and SQL query gateway.",
    tags: ["data", "internal"],
    status: "active",
    createdAt: daysAgo(93),
    lastDeployAt: minutesAgo(184),
  },
  {
    id: "proj-pulse",
    name: "Pulse Workers",
    description: "Background jobs, scheduled ETL and notification fan-out.",
    tags: ["workers", "production"],
    status: "active",
    createdAt: daysAgo(68),
    lastDeployAt: minutesAgo(310),
  },
  {
    id: "proj-lens",
    name: "Lens Docs",
    description: "Public documentation and search index.",
    tags: ["docs", "community"],
    status: "active",
    createdAt: daysAgo(42),
    lastDeployAt: minutesAgo(520),
  },
  {
    id: "proj-archive",
    name: "Legacy Console",
    description: "Frozen v1 console kept for audit exports.",
    tags: ["archived", "internal"],
    status: "archived",
    createdAt: daysAgo(402),
    lastDeployAt: daysAgo(96),
  },
];

export function environmentId(projectId: string, name: EnvironmentName): string {
  return `${projectId}-${name}`;
}

/** Every project gets the same production/staging pair, including new ones. */
export function environmentsFor(projectId: string): Environment[] {
  return (["production", "staging"] as const).map((name) => ({
    id: environmentId(projectId, name),
    projectId,
    name,
    branch: name === "production" ? "main" : "develop",
  }));
}

export const ENVIRONMENTS: readonly Environment[] = PROJECTS.flatMap((project) =>
  environmentsFor(project.id),
);

export function environmentOf(id: string): Environment | undefined {
  const match = /^(.*)-(production|staging)$/.exec(id);
  if (match === null) return undefined;
  const projectId = match[1] ?? "";
  const name = match[2] as EnvironmentName;
  return {
    id,
    projectId,
    name,
    branch: name === "production" ? "main" : "develop",
  };
}

// ============ servers ============

export const SERVERS: readonly Server[] = [
  {
    id: "srv-fra-1",
    name: "fra-prod-1",
    host: "49.12.84.21",
    region: "Frankfurt",
    status: "online",
    cpuPercent: 42,
    memoryPercent: 68,
    diskPercent: 54,
    services: 9,
    version: "0.26.1",
    createdAt: daysAgo(97),
    lastSeenAt: minutesAgo(1),
  },
  {
    id: "srv-fra-2",
    name: "fra-prod-2",
    host: "49.12.84.22",
    region: "Frankfurt",
    status: "online",
    cpuPercent: 67,
    memoryPercent: 74,
    diskPercent: 61,
    services: 7,
    version: "0.26.1",
    createdAt: daysAgo(86),
    lastSeenAt: minutesAgo(1),
  },
  {
    id: "srv-ams-1",
    name: "ams-edge-1",
    host: "185.40.12.8",
    region: "Amsterdam",
    status: "maintenance",
    cpuPercent: 12,
    memoryPercent: 31,
    diskPercent: 44,
    services: 3,
    version: "0.25.9",
    createdAt: daysAgo(64),
    lastSeenAt: minutesAgo(12),
  },
  {
    id: "srv-sin-1",
    name: "sin-staging-1",
    host: "139.180.22.77",
    region: "Singapore",
    status: "online",
    cpuPercent: 23,
    memoryPercent: 46,
    diskPercent: 38,
    services: 5,
    version: "0.26.1",
    createdAt: daysAgo(42),
    lastSeenAt: minutesAgo(2),
  },
  {
    id: "srv-nyc-1",
    name: "nyc-legacy-1",
    host: "164.90.18.4",
    region: "New York",
    status: "offline",
    cpuPercent: 0,
    memoryPercent: 0,
    diskPercent: 82,
    services: 0,
    version: "0.24.4",
    createdAt: daysAgo(402),
    lastSeenAt: daysAgo(3),
  },
];

export function serverOf(id: string): Server | undefined {
  return SERVERS.find((server) => server.id === id);
}

// ============ services ============

function application(spec: {
  repo: string;
  branch: string;
  buildType: ApplicationDetail["buildType"];
  port: number;
  runtime: ApplicationDetail["runtime"];
  replicas?: number;
  cpuLimit?: number;
  memoryLimitMb?: number;
  command?: string;
  healthcheckPath?: string;
  autoDeploy?: boolean;
}): ApplicationDetail {
  return {
    repo: spec.repo,
    branch: spec.branch,
    provider: spec.repo.startsWith("gitlab.") ? "gitlab" : "github",
    buildType: spec.buildType,
    buildPath: "/",
    dockerfile: "Dockerfile",
    port: spec.port,
    runtime: spec.runtime,
    replicas: spec.replicas ?? 2,
    cpuLimit: spec.cpuLimit ?? 1,
    memoryLimitMb: spec.memoryLimitMb ?? 1024,
    autoDeploy: spec.autoDeploy ?? true,
    previewDeployments: false,
    command: spec.command ?? "",
    args: "",
    healthcheckPath: spec.healthcheckPath ?? "/health",
    watchPaths: [],
  };
}

function service(spec: {
  id: string;
  projectId: string;
  environment: EnvironmentName;
  name: string;
  kind: ServiceKind;
  status: ServiceStatus;
  description: string;
  serverId: string;
  createdAt: string;
  lastDeployAt?: string;
  application?: ApplicationDetail;
}): Service {
  return {
    id: spec.id,
    projectId: spec.projectId,
    environmentId: environmentId(spec.projectId, spec.environment),
    name: spec.name,
    kind: spec.kind,
    status: spec.status,
    description: spec.description,
    serverId: spec.serverId,
    createdAt: spec.createdAt,
    ...(spec.lastDeployAt !== undefined ? { lastDeployAt: spec.lastDeployAt } : {}),
    ...(spec.application !== undefined ? { application: spec.application } : {}),
  };
}

export const SERVICES: readonly Service[] = [
  // Atlas — production
  service({
    id: "app-atlas-api",
    projectId: "proj-atlas",
    environment: "production",
    name: "api",
    kind: "application",
    status: "running",
    description: "GraphQL + REST gateway",
    serverId: "srv-fra-1",
    createdAt: daysAgo(180),
    lastDeployAt: minutesAgo(26),
    application: application({
      repo: "getatlas/api",
      branch: "main",
      buildType: "railpack",
      port: 8080,
      runtime: "node",
      replicas: 3,
      cpuLimit: 1.5,
      memoryLimitMb: 2048,
      command: "node dist/server.js",
      healthcheckPath: "/healthz",
    }),
  }),
  service({
    id: "app-atlas-web",
    projectId: "proj-atlas",
    environment: "production",
    name: "web",
    kind: "application",
    status: "running",
    description: "Customer dashboard",
    serverId: "srv-fra-1",
    createdAt: daysAgo(180),
    lastDeployAt: minutesAgo(74),
    application: application({
      repo: "getatlas/web",
      branch: "main",
      buildType: "dockerfile",
      port: 3000,
      runtime: "node",
      replicas: 2,
      healthcheckPath: "/",
    }),
  }),
  service({
    id: "db-atlas-postgres",
    projectId: "proj-atlas",
    environment: "production",
    name: "postgres",
    kind: "postgres",
    status: "running",
    description: "Primary relational database",
    serverId: "srv-fra-2",
    createdAt: daysAgo(179),
    lastDeployAt: minutesAgo(900),
  }),
  service({
    id: "cache-atlas-redis",
    projectId: "proj-atlas",
    environment: "production",
    name: "redis",
    kind: "redis",
    status: "running",
    description: "Session and rate-limit cache",
    serverId: "srv-fra-2",
    createdAt: daysAgo(179),
    lastDeployAt: minutesAgo(900),
  }),
  service({
    id: "compose-atlas-observability",
    projectId: "proj-atlas",
    environment: "production",
    name: "observability",
    kind: "compose",
    status: "error",
    description: "Grafana, Loki and Prometheus",
    serverId: "srv-ams-1",
    createdAt: daysAgo(144),
    lastDeployAt: minutesAgo(340),
  }),
  // Atlas — staging
  service({
    id: "app-atlas-api-staging",
    projectId: "proj-atlas",
    environment: "staging",
    name: "api-staging",
    kind: "application",
    status: "deploying",
    description: "Staging gateway",
    serverId: "srv-sin-1",
    createdAt: daysAgo(176),
    lastDeployAt: minutesAgo(4),
    application: application({
      repo: "getatlas/api",
      branch: "develop",
      buildType: "railpack",
      port: 8080,
      runtime: "node",
      replicas: 1,
      healthcheckPath: "/healthz",
    }),
  }),
  service({
    id: "app-atlas-web-staging",
    projectId: "proj-atlas",
    environment: "staging",
    name: "web-staging",
    kind: "application",
    status: "stopped",
    description: "Staging dashboard",
    serverId: "srv-sin-1",
    createdAt: daysAgo(176),
    lastDeployAt: daysAgo(7),
    application: application({
      repo: "getatlas/web",
      branch: "develop",
      buildType: "dockerfile",
      port: 3000,
      runtime: "node",
      replicas: 1,
    }),
  }),
  service({
    id: "db-atlas-postgres-staging",
    projectId: "proj-atlas",
    environment: "staging",
    name: "postgres-staging",
    kind: "postgres",
    status: "running",
    description: "Staging database seeded nightly",
    serverId: "srv-sin-1",
    createdAt: daysAgo(176),
    lastDeployAt: daysAgo(7),
  }),
  // Nova — production
  service({
    id: "app-nova-storefront",
    projectId: "proj-nova",
    environment: "production",
    name: "storefront",
    kind: "application",
    status: "running",
    description: "Headless commerce storefront",
    serverId: "srv-fra-1",
    createdAt: daysAgo(118),
    lastDeployAt: minutesAgo(74),
    application: application({
      repo: "novacom/storefront",
      branch: "main",
      buildType: "nixpacks",
      port: 3000,
      runtime: "node",
      replicas: 4,
      cpuLimit: 2,
      memoryLimitMb: 3072,
    }),
  }),
  service({
    id: "app-nova-admin",
    projectId: "proj-nova",
    environment: "production",
    name: "admin",
    kind: "application",
    status: "running",
    description: "Merchant back office",
    serverId: "srv-fra-2",
    createdAt: daysAgo(116),
    lastDeployAt: minutesAgo(220),
    application: application({
      repo: "novacom/admin",
      branch: "main",
      buildType: "dockerfile",
      port: 3001,
      runtime: "node",
    }),
  }),
  service({
    id: "db-nova-postgres",
    projectId: "proj-nova",
    environment: "production",
    name: "postgres",
    kind: "postgres",
    status: "running",
    description: "Orders and catalog",
    serverId: "srv-fra-2",
    createdAt: daysAgo(118),
    lastDeployAt: daysAgo(12),
  }),
  service({
    id: "cache-nova-redis",
    projectId: "proj-nova",
    environment: "production",
    name: "redis",
    kind: "redis",
    status: "running",
    description: "Cart and pricing cache",
    serverId: "srv-fra-2",
    createdAt: daysAgo(118),
    lastDeployAt: daysAgo(12),
  }),
  // Orbit — production
  service({
    id: "app-orbit-ingest",
    projectId: "proj-orbit",
    environment: "production",
    name: "ingest",
    kind: "application",
    status: "running",
    description: "Event ingestion edge",
    serverId: "srv-fra-1",
    createdAt: daysAgo(90),
    lastDeployAt: minutesAgo(184),
    application: application({
      repo: "orbit-data/ingest",
      branch: "main",
      buildType: "railpack",
      port: 9090,
      runtime: "go",
      replicas: 2,
      healthcheckPath: "/ready",
    }),
  }),
  service({
    id: "app-orbit-query",
    projectId: "proj-orbit",
    environment: "production",
    name: "query",
    kind: "application",
    status: "running",
    description: "SQL query gateway",
    serverId: "srv-fra-1",
    createdAt: daysAgo(88),
    lastDeployAt: minutesAgo(420),
    application: application({
      repo: "orbit-data/query",
      branch: "main",
      buildType: "dockerfile",
      port: 8081,
      runtime: "python",
      replicas: 2,
      healthcheckPath: "/health",
    }),
  }),
  service({
    id: "db-orbit-postgres",
    projectId: "proj-orbit",
    environment: "production",
    name: "warehouse",
    kind: "postgres",
    status: "running",
    description: "Warehouse metadata store",
    serverId: "srv-fra-2",
    createdAt: daysAgo(90),
    lastDeployAt: daysAgo(20),
  }),
  // Pulse — production
  service({
    id: "app-pulse-worker",
    projectId: "proj-pulse",
    environment: "production",
    name: "worker",
    kind: "application",
    status: "running",
    description: "Queue consumer fleet",
    serverId: "srv-fra-1",
    createdAt: daysAgo(64),
    lastDeployAt: minutesAgo(310),
    application: application({
      repo: "pulsehq/worker",
      branch: "main",
      buildType: "railpack",
      port: 7070,
      runtime: "bun",
      replicas: 6,
      cpuLimit: 2,
      memoryLimitMb: 4096,
      healthcheckPath: "/metrics",
    }),
  }),
  service({
    id: "app-pulse-scheduler",
    projectId: "proj-pulse",
    environment: "production",
    name: "scheduler",
    kind: "application",
    status: "idle",
    description: "Cron and delayed jobs",
    serverId: "srv-fra-1",
    createdAt: daysAgo(61),
    lastDeployAt: daysAgo(3),
    application: application({
      repo: "pulsehq/scheduler",
      branch: "main",
      buildType: "dockerfile",
      port: 7071,
      runtime: "node",
      replicas: 1,
      autoDeploy: false,
    }),
  }),
  service({
    id: "cache-pulse-redis",
    projectId: "proj-pulse",
    environment: "production",
    name: "redis",
    kind: "redis",
    status: "running",
    description: "Job queue broker",
    serverId: "srv-fra-2",
    createdAt: daysAgo(64),
    lastDeployAt: daysAgo(15),
  }),
  // Lens — production
  service({
    id: "app-lens-docs",
    projectId: "proj-lens",
    environment: "production",
    name: "docs",
    kind: "application",
    status: "running",
    description: "Public documentation site",
    serverId: "srv-fra-1",
    createdAt: daysAgo(40),
    lastDeployAt: minutesAgo(520),
    application: application({
      repo: "lynxland/docs",
      branch: "main",
      buildType: "static",
      port: 4321,
      runtime: "static",
      replicas: 2,
      healthcheckPath: "/",
    }),
  }),
  service({
    id: "compose-lens-search",
    projectId: "proj-lens",
    environment: "production",
    name: "search",
    kind: "compose",
    status: "running",
    description: "Meilisearch compose stack",
    serverId: "srv-fra-2",
    createdAt: daysAgo(40),
    lastDeployAt: daysAgo(2),
  }),
];

export function serviceOf(id: string): Service | undefined {
  return SERVICES.find((item) => item.id === id);
}

// ============ deployments ============

export const DEPLOYMENT_STATUS_OPTIONS = [
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
  { value: "queued", label: "Queued" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const COMMITS = [
  "a1f9c02",
  "b73d4e1",
  "c02aa18",
  "d9e7310",
  "e5b0f47",
  "f21c8a9",
  "0ac7d33",
  "18be5f2",
  "2d4c9ab",
  "3fe10c7",
  "4b8a2d6",
  "5c9e0f1",
];

const COMMIT_MESSAGES = [
  "feat: stream deployment logs over ndjson",
  "fix: keep preview domain on rollback",
  "chore: bump runtime image to node 22",
  "feat: add per-service health checks",
  "fix: retry proxy certificate issuance",
  "refactor: split compose stack into services",
  "feat: allow environment variable references",
  "fix: preserve build cache across deploys",
  "feat: surface queue latency in monitoring",
  "chore: rotate registry credentials",
  "feat: add staging branch previews",
  "fix: trim whitespace from env keys",
];

const AUTHORS = ["ada", "grace", "linus", "barbara", "edsger"];

type DeploymentSeed = {
  serviceId: string;
  status: DeploymentStatus;
  minutesAgo: number;
  trigger: DeploymentTrigger;
  runningNow?: boolean;
};

const DEPLOYMENT_SEEDS: readonly DeploymentSeed[] = [
  { serviceId: "app-atlas-api", status: "running", minutesAgo: 1, trigger: "manual" },
  { serviceId: "app-atlas-api-staging", status: "running", minutesAgo: 2, trigger: "git" },
  { serviceId: "app-atlas-api", status: "success", minutesAgo: 26, trigger: "git" },
  { serviceId: "app-nova-storefront", status: "success", minutesAgo: 74, trigger: "git" },
  { serviceId: "app-atlas-web", status: "success", minutesAgo: 74, trigger: "git" },
  { serviceId: "app-orbit-ingest", status: "success", minutesAgo: 184, trigger: "git" },
  { serviceId: "app-nova-admin", status: "success", minutesAgo: 220, trigger: "manual" },
  { serviceId: "app-pulse-worker", status: "success", minutesAgo: 310, trigger: "git" },
  { serviceId: "compose-atlas-observability", status: "failed", minutesAgo: 340, trigger: "git" },
  { serviceId: "app-atlas-api", status: "success", minutesAgo: 420, trigger: "git" },
  { serviceId: "app-orbit-query", status: "success", minutesAgo: 420, trigger: "rollback" },
  { serviceId: "app-lens-docs", status: "success", minutesAgo: 520, trigger: "git" },
  { serviceId: "app-atlas-web", status: "success", minutesAgo: 640, trigger: "git" },
  { serviceId: "app-atlas-api", status: "failed", minutesAgo: 700, trigger: "git" },
  { serviceId: "app-nova-storefront", status: "success", minutesAgo: 880, trigger: "git" },
  { serviceId: "db-atlas-postgres", status: "success", minutesAgo: 900, trigger: "manual" },
  { serviceId: "cache-atlas-redis", status: "success", minutesAgo: 900, trigger: "manual" },
  { serviceId: "app-pulse-scheduler", status: "success", minutesAgo: 1020, trigger: "schedule" },
  { serviceId: "app-orbit-ingest", status: "success", minutesAgo: 1100, trigger: "git" },
  { serviceId: "app-atlas-api", status: "success", minutesAgo: 1300, trigger: "git" },
  { serviceId: "app-nova-admin", status: "failed", minutesAgo: 1400, trigger: "git" },
  { serviceId: "app-atlas-web", status: "success", minutesAgo: 1500, trigger: "rollback" },
  { serviceId: "app-pulse-worker", status: "success", minutesAgo: 1620, trigger: "git" },
  { serviceId: "app-orbit-query", status: "success", minutesAgo: 1800, trigger: "git" },
  { serviceId: "app-lens-docs", status: "success", minutesAgo: 1980, trigger: "git" },
  { serviceId: "app-atlas-api-staging", status: "success", minutesAgo: 2160, trigger: "git" },
  { serviceId: "app-nova-storefront", status: "cancelled", minutesAgo: 2400, trigger: "manual" },
  { serviceId: "compose-lens-search", status: "success", minutesAgo: 2880, trigger: "git" },
  { serviceId: "app-atlas-api", status: "success", minutesAgo: 3200, trigger: "git" },
  { serviceId: "app-pulse-scheduler", status: "success", minutesAgo: 3600, trigger: "schedule" },
  { serviceId: "app-atlas-web", status: "success", minutesAgo: 4200, trigger: "git" },
  { serviceId: "app-nova-storefront", status: "success", minutesAgo: 4800, trigger: "git" },
  { serviceId: "app-orbit-ingest", status: "queued", minutesAgo: 12, trigger: "manual" },
  { serviceId: "app-pulse-worker", status: "queued", minutesAgo: 8, trigger: "git" },
];

function durationFor(status: DeploymentStatus, index: number): number | undefined {
  if (status === "running" || status === "queued") return undefined;
  if (status === "cancelled") return 4_000 + (index % 3) * 1_000;
  if (status === "failed") return 24_000 + (index % 4) * 9_000;
  return 38_000 + (index % 7) * 14_000;
}

export const DEPLOYMENTS: readonly Deployment[] = DEPLOYMENT_SEEDS.map((seed, index) => {
  const item = serviceOf(seed.serviceId);
  const environment = item ? environmentOf(item.environmentId) : undefined;
  const startedAt = minutesAgo(seed.minutesAgo);
  const durationMs = durationFor(seed.status, index);
  const startedMs = new Date(startedAt).getTime();
  return {
    id: `dpl-${String(1042 - index)}`,
    projectId: item?.projectId ?? "proj-atlas",
    serviceId: seed.serviceId,
    serviceName: item?.name ?? seed.serviceId,
    environment: environment?.name ?? "production",
    status: seed.status,
    commit: COMMITS[index % COMMITS.length]!,
    commitMessage: COMMIT_MESSAGES[index % COMMIT_MESSAGES.length]!,
    branch: environment?.branch ?? "main",
    author: AUTHORS[index % AUTHORS.length]!,
    trigger: seed.trigger,
    startedAt,
    ...(durationMs !== undefined
      ? {
          finishedAt: new Date(startedMs + durationMs).toISOString(),
          durationMs,
        }
      : {}),
    server: item ? (serverOf(item.serverId)?.name ?? "fra-prod-1") : "fra-prod-1",
  };
});

// ============ domains ============

export const DOMAINS: readonly Domain[] = [
  {
    id: "dom-atlas-api",
    serviceId: "app-atlas-api",
    host: "api.atlas.example.com",
    path: "/",
    port: 8080,
    https: true,
    certificate: "active",
    status: "active",
  },
  {
    id: "dom-atlas-api-alt",
    serviceId: "app-atlas-api",
    host: "v2-api.atlas.example.com",
    path: "/",
    port: 8080,
    https: true,
    certificate: "active",
    status: "active",
  },
  {
    id: "dom-atlas-web",
    serviceId: "app-atlas-web",
    host: "app.atlas.example.com",
    path: "/",
    port: 3000,
    https: true,
    certificate: "active",
    status: "active",
  },
  {
    id: "dom-atlas-api-staging",
    serviceId: "app-atlas-api-staging",
    host: "staging-api.atlas.example.com",
    path: "/",
    port: 8080,
    https: true,
    certificate: "pending",
    status: "pending",
  },
  {
    id: "dom-nova-storefront",
    serviceId: "app-nova-storefront",
    host: "shop.nova.example.com",
    path: "/",
    port: 3000,
    https: true,
    certificate: "active",
    status: "active",
  },
  {
    id: "dom-nova-admin",
    serviceId: "app-nova-admin",
    host: "admin.nova.example.com",
    path: "/",
    port: 3001,
    https: true,
    certificate: "expired",
    status: "error",
  },
  {
    id: "dom-orbit-ingest",
    serviceId: "app-orbit-ingest",
    host: "ingest.orbit.example.com",
    path: "/v1/events",
    port: 9090,
    https: true,
    certificate: "active",
    status: "active",
  },
  {
    id: "dom-lens-docs",
    serviceId: "app-lens-docs",
    host: "docs.lynxland.dev",
    path: "/",
    port: 4321,
    https: true,
    certificate: "active",
    status: "active",
  },
  {
    id: "dom-atlas-web-staging",
    serviceId: "app-atlas-web-staging",
    host: "staging.atlas.example.com",
    path: "/",
    port: 3000,
    https: false,
    certificate: "none",
    status: "active",
  },
];

// ============ environment variables ============

export const ENV_VARS: readonly EnvVar[] = [
  {
    id: "env-atlas-db",
    serviceId: "app-atlas-api",
    key: "DATABASE_URL",
    value: "postgres://atlas:super-secret@db-atlas-postgres:5432/atlas",
    secret: true,
    updatedAt: minutesAgo(26),
  },
  {
    id: "env-atlas-redis",
    serviceId: "app-atlas-api",
    key: "REDIS_URL",
    value: "redis://cache-atlas-redis:6379/0",
    secret: true,
    updatedAt: minutesAgo(26),
  },
  {
    id: "env-atlas-node",
    serviceId: "app-atlas-api",
    key: "NODE_ENV",
    value: "production",
    secret: false,
    updatedAt: daysAgo(14),
  },
  {
    id: "env-atlas-log",
    serviceId: "app-atlas-api",
    key: "LOG_LEVEL",
    value: "info",
    secret: false,
    updatedAt: daysAgo(14),
  },
  {
    id: "env-atlas-stripe",
    serviceId: "app-atlas-api",
    key: "STRIPE_SECRET_KEY",
    value: "demo-stripe-secret-placeholder",
    secret: true,
    updatedAt: daysAgo(3),
  },
  {
    id: "env-atlas-flags",
    serviceId: "app-atlas-api",
    key: "FEATURE_FLAGS",
    value: "checkout_v2,new_nav",
    secret: false,
    updatedAt: daysAgo(2),
  },
  {
    id: "env-atlas-web-api",
    serviceId: "app-atlas-web",
    key: "VITE_API_URL",
    value: "https://api.atlas.example.com",
    secret: false,
    updatedAt: daysAgo(14),
  },
  {
    id: "env-atlas-web-sentry",
    serviceId: "app-atlas-web",
    key: "SENTRY_DSN",
    value: "https://public@sentry.example.com/42",
    secret: true,
    updatedAt: daysAgo(9),
  },
  {
    id: "env-nova-db",
    serviceId: "app-nova-storefront",
    key: "DATABASE_URL",
    value: "postgres://nova:secret@db-nova-postgres:5432/nova",
    secret: true,
    updatedAt: minutesAgo(74),
  },
  {
    id: "env-nova-cdn",
    serviceId: "app-nova-storefront",
    key: "CDN_ORIGIN",
    value: "https://cdn.nova.example.com",
    secret: false,
    updatedAt: daysAgo(8),
  },
  {
    id: "env-orbit-token",
    serviceId: "app-orbit-ingest",
    key: "INGEST_TOKEN",
    value: "ing_live_9d2f8ea7c1",
    secret: true,
    updatedAt: minutesAgo(184),
  },
  {
    id: "env-pulse-db",
    serviceId: "app-pulse-worker",
    key: "DATABASE_URL",
    value: "postgres://pulse:secret@db-atlas-postgres:5432/pulse",
    secret: true,
    updatedAt: minutesAgo(310),
  },
  {
    id: "env-lens-algolia",
    serviceId: "app-lens-docs",
    key: "SEARCH_API_KEY",
    value: "search_live_71aa20",
    secret: true,
    updatedAt: daysAgo(3),
  },
];

// ============ mock collections + entities ============

const projectsMock = mockCollection(PROJECTS, { dialect: "offset", latencyMs: 90 });
export const projectsFailureHandle = projectsMock.handle;

const servicesMock = mockCollection(SERVICES, { dialect: "offset", latencyMs: 110 });
export const servicesFailureHandle = servicesMock.handle;

const deploymentsMock = mockCollection(DEPLOYMENTS, { dialect: "offset", latencyMs: 140 });
export const deploymentsFailureHandle = deploymentsMock.handle;

const domainsMock = mockCollection(DOMAINS, { dialect: "offset", latencyMs: 100 });
export const domainsFailureHandle = domainsMock.handle;

const envVarsMock = mockCollection(ENV_VARS, { dialect: "offset", latencyMs: 80 });
export const envVarsFailureHandle = envVarsMock.handle;

const serversMock = mockCollection(SERVERS, { dialect: "offset", latencyMs: 70 });
export const serversFailureHandle = serversMock.handle;

// ============ commands ============

export interface CreateProjectInput {
  name: string;
  description: string;
  tags: string;
}

export const createProject: Command<CreateProjectInput, Project> = {
  run: async (input) => {
    await delay(160);
    const name = input.name.trim();
    if (name === "") {
      return rejected("Project name is required", { fieldErrors: { name: "Required" } });
    }
    const duplicate = projectsMock.handle
      .rows()
      .some((project) => project.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      return rejected(`A project named "${name}" already exists`, {
        code: "duplicate-name",
        fieldErrors: { name: "Choose a unique name" },
      });
    }
    const project: Project = {
      id: `proj-${slug(name)}-${Date.now().toString(36)}`,
      name,
      description: input.description.trim(),
      tags: input.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: "active",
      createdAt: new Date().toISOString(),
    };
    projectsMock.handle.replaceRows([project, ...projectsMock.handle.rows()]);
    return ok(project);
  },
};

export const deleteProject: Command<string, null> = {
  run: async (projectId) => {
    await delay(120);
    const serviceIds = new Set(
      servicesMock.handle
        .rows()
        .filter((item) => item.projectId === projectId)
        .map((item) => item.id),
    );
    projectsMock.handle.replaceRows(
      projectsMock.handle.rows().filter((project) => project.id !== projectId),
    );
    servicesMock.handle.replaceRows(
      servicesMock.handle.rows().filter((item) => item.projectId !== projectId),
    );
    deploymentsMock.handle.replaceRows(
      deploymentsMock.handle.rows().filter((deployment) => deployment.projectId !== projectId),
    );
    domainsMock.handle.replaceRows(
      domainsMock.handle.rows().filter((domain) => !serviceIds.has(domain.serviceId)),
    );
    envVarsMock.handle.replaceRows(
      envVarsMock.handle.rows().filter((env) => !serviceIds.has(env.serviceId)),
    );
    return ok(null);
  },
  effects: [
    invalidate("dokploy-projects"),
    invalidate("dokploy-services"),
    invalidate("dokploy-deployments"),
    invalidate("dokploy-domains"),
    invalidate("dokploy-env-vars"),
  ],
};

export interface CreateApplicationInput {
  projectId: string;
  environmentId: string;
  name: string;
  description: string;
  serverId: string;
  repo: string;
  branch: string;
  buildType: ApplicationDetail["buildType"];
  runtime: ApplicationDetail["runtime"];
  port: number;
}

export const createApplication: Command<CreateApplicationInput, Service> = {
  run: async (input) => {
    await delay(180);
    const name = input.name.trim();
    const duplicate = servicesMock.handle
      .rows()
      .some(
        (item) =>
          item.environmentId === input.environmentId &&
          item.name.toLowerCase() === name.toLowerCase(),
      );
    if (duplicate) {
      return rejected(`A service named "${name}" already exists in this environment`, {
        code: "duplicate-name",
        fieldErrors: { name: "Choose a unique name" },
      });
    }
    const item: Service = {
      id: `app-${slug(name)}-${Date.now().toString(36)}`,
      projectId: input.projectId,
      environmentId: input.environmentId,
      name,
      kind: "application",
      status: "idle",
      description: input.description.trim() || "Application service",
      serverId: input.serverId,
      createdAt: new Date().toISOString(),
      application: application({
        repo: input.repo.trim(),
        branch: input.branch.trim() || "main",
        buildType: input.buildType,
        port: Number(input.port) || 3000,
        runtime: input.runtime,
      }),
    };
    servicesMock.handle.replaceRows([item, ...servicesMock.handle.rows()]);
    return ok(item);
  },
};

export interface UpdateApplicationInput {
  id: string;
  name: string;
  description: string;
  serverId: string;
  repo: string;
  branch: string;
  buildType: ApplicationDetail["buildType"];
  runtime: ApplicationDetail["runtime"];
  port: number;
}

export const updateApplication: Command<UpdateApplicationInput, Service> = {
  run: async (input) => {
    await delay(140);
    const rows = servicesMock.handle.rows();
    const current = rows.find((item) => item.id === input.id);
    if (current === undefined || current.application === undefined) {
      return rejected("Application no longer exists", { code: "not-found" });
    }
    const next: Service = {
      ...current,
      name: input.name.trim() || current.name,
      description: input.description.trim(),
      serverId: input.serverId || current.serverId,
      application: {
        ...current.application,
        repo: input.repo.trim() || current.application.repo,
        branch: input.branch.trim() || current.application.branch,
        buildType: input.buildType,
        runtime: input.runtime,
        port: Number(input.port) || current.application.port,
      },
    };
    servicesMock.handle.replaceRows(rows.map((item) => (item.id === input.id ? next : item)));
    return ok(next);
  },
};

export interface DeleteServiceInput {
  serviceId: string;
}

export const deleteService: Command<DeleteServiceInput, null> = {
  run: async (input) => {
    await delay(120);
    servicesMock.handle.replaceRows(
      servicesMock.handle.rows().filter((item) => item.id !== input.serviceId),
    );
    domainsMock.handle.replaceRows(
      domainsMock.handle.rows().filter((domain) => domain.serviceId !== input.serviceId),
    );
    envVarsMock.handle.replaceRows(
      envVarsMock.handle.rows().filter((env) => env.serviceId !== input.serviceId),
    );
    deploymentsMock.handle.replaceRows(
      deploymentsMock.handle
        .rows()
        .filter((deployment) => deployment.serviceId !== input.serviceId),
    );
    return ok(null);
  },
  effects: [
    invalidate("dokploy-services"),
    invalidate("dokploy-domains"),
    invalidate("dokploy-env-vars"),
    invalidate("dokploy-deployments"),
  ],
};

export const deployService: Command<string, Deployment> = {
  run: async (serviceId) => {
    await delay(900);
    const rows = servicesMock.handle.rows();
    const current = rows.find((item) => item.id === serviceId);
    if (current === undefined) {
      return rejected("Service no longer exists", { code: "not-found" });
    }
    const at = new Date();
    const next: Service = {
      ...current,
      status: "running",
      lastDeployAt: at.toISOString(),
    };
    servicesMock.handle.replaceRows(rows.map((item) => (item.id === serviceId ? next : item)));
    const environment = environmentOf(current.environmentId);
    const deployment: Deployment = {
      id: `dpl-${Date.now().toString(36)}`,
      projectId: current.projectId,
      serviceId: current.id,
      serviceName: current.name,
      environment: environment?.name ?? "production",
      status: "success",
      commit: COMMITS[Math.floor(Math.random() * COMMITS.length)]!,
      commitMessage: "Deploy triggered from the uikit Dokploy console",
      branch: current.application?.branch ?? environment?.branch ?? "main",
      author: "ada",
      trigger: "manual",
      startedAt: at.toISOString(),
      finishedAt: new Date(at.getTime() + 42_000).toISOString(),
      durationMs: 42_000,
      server: serverOf(current.serverId)?.name ?? "fra-prod-1",
    };
    deploymentsMock.handle.replaceRows([deployment, ...deploymentsMock.handle.rows()]);
    return ok(deployment);
  },
  effects: [invalidate("dokploy-services"), invalidate("dokploy-deployments")],
};

export interface CreateEnvVarInput {
  serviceId: string;
  key: string;
  value: string;
  secret: boolean;
}

export const createEnvVar: Command<CreateEnvVarInput, EnvVar> = {
  run: async (input) => {
    await delay(110);
    const key = input.key.trim().toUpperCase();
    if (key === "") {
      return rejected("Key is required", { fieldErrors: { key: "Required" } });
    }
    const duplicate = envVarsMock.handle
      .rows()
      .some((env) => env.serviceId === input.serviceId && env.key === key);
    if (duplicate) {
      return rejected(`Environment variable "${key}" already exists`, {
        code: "duplicate-key",
        fieldErrors: { key: "Duplicate key" },
      });
    }
    const envVar: EnvVar = {
      id: `env-${Date.now().toString(36)}`,
      serviceId: input.serviceId,
      key,
      value: input.value,
      secret: input.secret,
      updatedAt: new Date().toISOString(),
    };
    envVarsMock.handle.replaceRows([envVar, ...envVarsMock.handle.rows()]);
    return ok(envVar);
  },
};

export interface UpdateEnvVarInput extends CreateEnvVarInput {
  id: string;
}

export const updateEnvVar: Command<UpdateEnvVarInput, EnvVar> = {
  run: async (input) => {
    await delay(110);
    const rows = envVarsMock.handle.rows();
    const current = rows.find((env) => env.id === input.id);
    if (current === undefined) {
      return rejected("Environment variable no longer exists", { code: "not-found" });
    }
    const key = input.key.trim().toUpperCase();
    const duplicate = rows.some(
      (env) => env.id !== input.id && env.serviceId === input.serviceId && env.key === key,
    );
    if (duplicate) {
      return rejected(`Environment variable "${key}" already exists`, {
        code: "duplicate-key",
        fieldErrors: { key: "Duplicate key" },
      });
    }
    const next: EnvVar = {
      ...current,
      key,
      value: input.value,
      secret: input.secret,
      updatedAt: new Date().toISOString(),
    };
    envVarsMock.handle.replaceRows(rows.map((env) => (env.id === input.id ? next : env)));
    return ok(next);
  },
};

export const deleteEnvVar: Command<string, null> = {
  run: async (id) => {
    await delay(80);
    envVarsMock.handle.replaceRows(envVarsMock.handle.rows().filter((env) => env.id !== id));
    return ok(null);
  },
};

export interface CreateServerInput {
  name: string;
  host: string;
  region: string;
  provider: string;
}

export const createServer: Command<CreateServerInput, Server> = {
  run: async (input) => {
    await delay(150);
    const name = input.name.trim();
    if (name === "") {
      return rejected("Server name is required", { fieldErrors: { name: "Required" } });
    }
    if (serversMock.handle.rows().some((server) => server.name === name)) {
      return rejected(`A server named "${name}" already exists`, {
        code: "duplicate-name",
        fieldErrors: { name: "Choose a unique name" },
      });
    }
    const server: Server = {
      id: `srv-${slug(name)}-${Date.now().toString(36)}`,
      name,
      host: input.host.trim(),
      region: input.region,
      status: "online",
      cpuPercent: 8,
      memoryPercent: 18,
      diskPercent: 12,
      services: 0,
      version: "0.26.1",
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    serversMock.handle.replaceRows([server, ...serversMock.handle.rows()]);
    return ok(server);
  },
};

export const deleteServer: Command<string, null> = {
  run: async (id) => {
    await delay(120);
    serversMock.handle.replaceRows(serversMock.handle.rows().filter((server) => server.id !== id));
    return ok(null);
  },
};

export const projectCommands = {
  create: createProject,
  delete: deleteProject,
} as const;

export const applicationCommands = {
  create: createApplication,
  update: updateApplication,
  delete: deleteService,
  deploy: deployService,
} as const;

export const envVarCommands = {
  create: createEnvVar,
  update: updateEnvVar,
  delete: deleteEnvVar,
} as const;

export const serverCommands = {
  create: createServer,
  delete: deleteServer,
} as const;

export const projectsEntity = defineEntity({
  name: "dokploy-projects",
  key: (row) => row.id,
  collection: projectsMock.collection,
  record: projectsMock.record,
  lookup: projectsMock.lookup,
  commands: projectCommands,
});

export const servicesEntity = defineEntity({
  name: "dokploy-services",
  key: (row) => row.id,
  collection: servicesMock.collection,
  record: servicesMock.record,
  lookup: servicesMock.lookup,
  commands: applicationCommands,
});

export const deploymentsEntity = defineEntity({
  name: "dokploy-deployments",
  key: (row) => row.id,
  collection: deploymentsMock.collection,
  record: deploymentsMock.record,
  lookup: deploymentsMock.lookup,
});

export const domainsEntity = defineEntity({
  name: "dokploy-domains",
  key: (row) => row.id,
  collection: domainsMock.collection,
  record: domainsMock.record,
  lookup: domainsMock.lookup,
});

export const envVarsEntity = defineEntity({
  name: "dokploy-env-vars",
  key: (row) => row.id,
  collection: envVarsMock.collection,
  record: envVarsMock.record,
  lookup: envVarsMock.lookup,
  commands: envVarCommands,
});

export const serversEntity = defineEntity({
  name: "dokploy-servers",
  key: (row) => row.id,
  collection: serversMock.collection,
  record: serversMock.record,
  lookup: serversMock.lookup,
  commands: serverCommands,
});

// ============ URL search ============

export const deploymentsSearch = collectionSearch({
  text: ["id", "serviceName", "commitMessage", "author", "branch"],
  filters: [
    {
      field: "status",
      op: "in",
      kind: "enum",
      label: "Status",
      options: DEPLOYMENT_STATUS_OPTIONS,
    },
  ],
  defaultSize: 10,
  defaultSort: [{ field: "startedAt", dir: "desc" }],
  defaultPage: { kind: "offset", offset: 0 },
});

// ============ deployment logs (mockTransport + backlog prelude) ============

export type LogLevel = "info" | "warn" | "error";

export interface DeploymentLogFrame {
  ts: string;
  level: LogLevel;
  msg: string;
}

const LOG_LINES = [
  "Cloning repository from origin",
  "Resolved build plan",
  "Restoring layer cache (npm)",
  "Installing production dependencies",
  "Running build command",
  "Build artifact created (42.8 MB)",
  "Pushing image to registry",
  "Creating container",
  "Attaching network dokploy-network",
  "Mounting environment variables",
  "Starting healthcheck probe",
  "Healthcheck passed (200 OK in 184ms)",
  "Attaching reverse proxy route",
  "Requesting TLS certificate",
  "Certificate issued, HTTPS enabled",
  "Draining previous container",
  "Deployment is live",
];

function logLine(deploymentId: string, seq: number): DeploymentLogFrame {
  return {
    ts: new Date().toISOString(),
    level: seq % 23 === 0 ? "error" : seq % 9 === 0 ? "warn" : "info",
    msg: `[${deploymentId}] ${LOG_LINES[seq % LOG_LINES.length]} (#${seq})`,
  };
}

/**
 * Backlog × live tail over core `mockTransport`.
 *
 * `mockTransport` only emits live frames; the source preludes a deterministic
 * backlog so `useStream` sees the same shape as a resumable production stream.
 */
export function createDeploymentLogSource(
  deploymentId: string,
  intervalMs = 800,
): StreamSource<DeploymentLogFrame> {
  const backlog: DeploymentLogFrame[] = Array.from({ length: 24 }, (_, index) => ({
    ts: new Date(NOW - (24 - index) * 1_200).toISOString(),
    level: index % 11 === 0 ? "warn" : "info",
    msg: `[${deploymentId}] ${LOG_LINES[index % LOG_LINES.length]} (backlog #${index + 1})`,
  }));

  const live = mockTransport<DeploymentLogFrame>({
    auto: {
      intervalMs,
      startSeq: 1,
      frame: (seq) => logLine(deploymentId, seq),
    },
  });

  return {
    open(cursor, signal) {
      const inner = live.open(cursor, signal);
      const iterator = (async function* () {
        for (const frame of backlog) {
          if (signal.aborted) return;
          yield frame;
        }
        const source = inner[Symbol.asyncIterator]();
        try {
          while (true) {
            const result = await source.next();
            if (result.done === true) return;
            yield result.value;
          }
        } finally {
          await source.return?.();
        }
      })();
      return {
        [Symbol.asyncIterator]: () => iterator,
        get closeReason() {
          return inner.closeReason;
        },
      };
    },
  };
}

// ============ metrics ============

const METRIC_STEPS = 40;
const METRIC_STEP_MS = 30_000;
const METRIC_END = Math.floor(Date.now() / METRIC_STEP_MS) * METRIC_STEP_MS;

function hash(input: string): number {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

function points(seed: string, scale: number): { t: number; v: number }[] {
  const base = hash(seed);
  return Array.from({ length: METRIC_STEPS }, (_, index) => {
    const t = METRIC_END - (METRIC_STEPS - 1 - index) * METRIC_STEP_MS;
    const wave = Math.sin((index / METRIC_STEPS) * Math.PI * 5 + (base % 13)) * 0.2;
    const noise = (((base * 31 + index * 19) % 15) - 7) * 0.012;
    return { t, v: Math.max(0, (0.42 + wave + noise) * scale) };
  });
}

export interface ApplicationMetrics {
  cpu: readonly MetricSeries[];
  memory: readonly MetricSeries[];
  network: readonly MetricSeries[];
  blockIo: readonly MetricSeries[];
}

export function applicationMetrics(serviceId: string): ApplicationMetrics {
  return {
    cpu: ["app", "sidecar"].map((suffix) => ({
      key: `cpu-${suffix}`,
      label: suffix,
      points: points(`${serviceId}-cpu-${suffix}`, 100),
    })),
    memory: ["rss", "cache"].map((suffix) => ({
      key: `memory-${suffix}`,
      label: suffix,
      points: points(`${serviceId}-memory-${suffix}`, 1024 ** 3),
    })),
    network: ["ingress", "egress"].map((suffix) => ({
      key: `network-${suffix}`,
      label: suffix,
      points: points(`${serviceId}-network-${suffix}`, 80),
    })),
    blockIo: ["read", "write"].map((suffix) => ({
      key: `block-${suffix}`,
      label: suffix,
      points: points(`${serviceId}-block-${suffix}`, 1024 ** 2),
    })),
  };
}
