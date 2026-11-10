import { useCommandForm } from "@lynxland/uikit-react";
import { type FieldInput, FormView, useUiAdapter } from "@lynxland/uikit-surfaces";
import {
  type CreateApplicationInput,
  type CreateEnvVarInput,
  type CreateProjectInput,
  type CreateServerInput,
  createApplication,
  createEnvVar,
  createProject,
  createServer,
  type EnvVar,
  envVarsEntity,
  projectsEntity,
  type Server,
  type Service,
  serversEntity,
  servicesEntity,
  type UpdateApplicationInput,
  type UpdateEnvVarInput,
  updateApplication,
  updateEnvVar,
} from "@/lib/dokploy";

const BUILD_TYPE_OPTIONS = [
  { value: "railpack", label: "Railpack (auto)" },
  { value: "nixpacks", label: "Nixpacks" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "static", label: "Static site" },
] as const;

const RUNTIME_OPTIONS = [
  { value: "node", label: "Node.js" },
  { value: "bun", label: "Bun" },
  { value: "deno", label: "Deno" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "static", label: "Static" },
] as const;

const REGION_OPTIONS = [
  { value: "Frankfurt", label: "Frankfurt" },
  { value: "Amsterdam", label: "Amsterdam" },
  { value: "Singapore", label: "Singapore" },
  { value: "New York", label: "New York" },
] as const;

const PROVIDER_OPTIONS = [
  { value: "Hetzner", label: "Hetzner" },
  { value: "DigitalOcean", label: "DigitalOcean" },
  { value: "AWS", label: "AWS" },
  { value: "Other", label: "Other" },
] as const;

const projectFields: readonly FieldInput<CreateProjectInput>[] = [
  {
    name: "name",
    kind: "text",
    label: "Project name",
    placeholder: "Atlas Platform",
    required: true,
  },
  {
    name: "description",
    kind: "text",
    label: "Description",
    placeholder: "What does this project ship?",
  },
  {
    name: "tags",
    kind: "text",
    label: "Tags",
    placeholder: "platform, production",
  },
];

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ui = useUiAdapter();
  const form = useCommandForm(
    createProject,
    {
      fields: projectFields,
      defaultValues: { name: "", description: "", tags: "" },
    },
    {
      entity: projectsEntity.collection,
      onSettled: (result) => {
        if (result?.status === "ok") onOpenChange(false);
      },
    },
  );

  return (
    <ui.Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create project"
      description="Projects group environments, services and deployments."
      size="md"
    >
      <FormView
        form={form}
        fields={projectFields}
        submitLabel="Create project"
        cancel={() => onOpenChange(false)}
      />
    </ui.Dialog>
  );
}

export function createApplicationFields(
  servers: readonly Server[],
): readonly FieldInput<CreateApplicationInput>[] {
  return [
    {
      name: "name",
      kind: "text",
      label: "Service name",
      placeholder: "api",
      required: true,
    },
    {
      name: "description",
      kind: "text",
      label: "Description",
      placeholder: "GraphQL + REST gateway",
    },
    {
      name: "repo",
      kind: "text",
      label: "Repository",
      placeholder: "getatlas/api",
      required: true,
    },
    {
      name: "branch",
      kind: "text",
      label: "Branch",
      placeholder: "main",
    },
    {
      name: "buildType",
      kind: "enum",
      label: "Build type",
      options: BUILD_TYPE_OPTIONS,
    },
    {
      name: "runtime",
      kind: "enum",
      label: "Runtime",
      options: RUNTIME_OPTIONS,
    },
    {
      name: "port",
      kind: "number",
      label: "Container port",
      placeholder: "3000",
    },
    {
      name: "serverId",
      kind: "enum",
      label: "Server",
      options: servers.map((server) => ({
        value: server.id,
        label: `${server.name} · ${server.region}`,
      })),
    },
  ];
}

export function createApplicationDefaults(
  projectId: string,
  environmentId: string,
  servers: readonly Server[],
): Partial<CreateApplicationInput> {
  return {
    projectId,
    environmentId,
    name: "",
    description: "",
    repo: "",
    branch: "main",
    buildType: "railpack",
    runtime: "node",
    port: 3000,
    serverId: servers[0]?.id ?? "",
  };
}

export function CreateApplicationDialog({
  open,
  onOpenChange,
  projectId,
  environmentId,
  servers,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  environmentId: string;
  servers: readonly Server[];
  onCreated?: (service: Service) => void;
}) {
  const ui = useUiAdapter();
  const fields = createApplicationFields(servers);
  const form = useCommandForm(
    createApplication,
    {
      fields,
      defaultValues: createApplicationDefaults(projectId, environmentId, servers),
    },
    {
      entity: servicesEntity.collection,
      onSettled: (result) => {
        if (result?.status !== "ok") return;
        onCreated?.(result.payload);
        onOpenChange(false);
      },
    },
  );

  return (
    <ui.Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create application"
      description="Source, build and runtime defaults can be edited after creation."
      size="lg"
    >
      <FormView
        form={form}
        fields={fields}
        submitLabel="Create application"
        cancel={() => onOpenChange(false)}
      />
    </ui.Dialog>
  );
}

export function updateApplicationFields(
  servers: readonly Server[],
): readonly FieldInput<UpdateApplicationInput>[] {
  return [
    { name: "name", kind: "text", label: "Service name", required: true },
    { name: "description", kind: "text", label: "Description" },
    { name: "repo", kind: "text", label: "Repository", required: true },
    { name: "branch", kind: "text", label: "Branch" },
    { name: "buildType", kind: "enum", label: "Build type", options: BUILD_TYPE_OPTIONS },
    { name: "runtime", kind: "enum", label: "Runtime", options: RUNTIME_OPTIONS },
    { name: "port", kind: "number", label: "Container port" },
    {
      name: "serverId",
      kind: "enum",
      label: "Server",
      options: servers.map((server) => ({
        value: server.id,
        label: `${server.name} · ${server.region}`,
      })),
    },
  ];
}

export function EditApplicationDrawer({
  service,
  servers,
  onClose,
  onSaved,
}: {
  service: Service;
  servers: readonly Server[];
  onClose: () => void;
  onSaved?: (service: Service) => void;
}) {
  const ui = useUiAdapter();
  const fields = updateApplicationFields(servers);
  const detail = service.application;
  const form = useCommandForm(
    updateApplication,
    {
      fields,
      defaultValues: {
        id: service.id,
        name: service.name,
        description: service.description,
        serverId: service.serverId,
        repo: detail?.repo ?? "",
        branch: detail?.branch ?? "main",
        buildType: detail?.buildType ?? "railpack",
        runtime: detail?.runtime ?? "node",
        port: detail?.port ?? 3000,
      },
    },
    {
      entity: servicesEntity.collection,
      id: service.id,
      onSettled: (result) => {
        if (result?.status !== "ok") return;
        onSaved?.(result.payload);
        onClose();
      },
    },
  );

  return (
    <ui.Drawer
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={`Edit ${service.name}`}
      description="Source and build settings update through the same command binding."
      size="lg"
    >
      <FormView form={form} fields={fields} submitLabel="Save application" cancel={onClose} />
    </ui.Drawer>
  );
}

const envVarFields: readonly FieldInput<CreateEnvVarInput>[] = [
  {
    name: "key",
    kind: "text",
    label: "Key",
    placeholder: "DATABASE_URL",
    required: true,
  },
  {
    name: "value",
    kind: "text",
    label: "Value",
    placeholder: "postgres://…",
  },
  { name: "secret", kind: "boolean", label: "Secret value" },
];

const editEnvVarFields: readonly FieldInput<UpdateEnvVarInput>[] = [
  { name: "key", kind: "text", label: "Key", required: true },
  { name: "value", kind: "text", label: "Value" },
  { name: "secret", kind: "boolean", label: "Secret value" },
];

export function AddEnvVarDrawer({
  serviceId,
  onClose,
}: {
  serviceId: string;
  onClose: () => void;
}) {
  const ui = useUiAdapter();
  const form = useCommandForm(
    createEnvVar,
    {
      fields: envVarFields,
      defaultValues: { serviceId, key: "", value: "", secret: true },
    },
    {
      entity: envVarsEntity.collection,
      onSettled: (result) => {
        if (result?.status === "ok") onClose();
      },
    },
  );

  return (
    <ui.Drawer
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Add environment variable"
      description="Keys are upper-cased. Secret values stay masked in the table."
      size="md"
    >
      <FormView form={form} fields={envVarFields} submitLabel="Add variable" cancel={onClose} />
    </ui.Drawer>
  );
}

export function EditEnvVarDrawer({ envVar, onClose }: { envVar: EnvVar; onClose: () => void }) {
  const ui = useUiAdapter();
  const form = useCommandForm(
    updateEnvVar,
    {
      fields: editEnvVarFields,
      defaultValues: {
        id: envVar.id,
        serviceId: envVar.serviceId,
        key: envVar.key,
        value: envVar.value,
        secret: envVar.secret,
      },
    },
    {
      entity: envVarsEntity.collection,
      id: envVar.id,
      onSettled: (result) => {
        if (result?.status === "ok") onClose();
      },
    },
  );

  return (
    <ui.Drawer
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={`Edit ${envVar.key}`}
      description="Updating the value invalidates the environment table through the command binding."
      size="md"
    >
      <FormView
        form={form}
        fields={editEnvVarFields}
        submitLabel="Save variable"
        cancel={onClose}
      />
    </ui.Drawer>
  );
}

const serverFields: readonly FieldInput<CreateServerInput>[] = [
  { name: "name", kind: "text", label: "Name", placeholder: "fra-prod-3", required: true },
  { name: "host", kind: "text", label: "Host", placeholder: "49.12.84.23" },
  { name: "region", kind: "enum", label: "Region", options: REGION_OPTIONS },
  { name: "provider", kind: "enum", label: "Provider", options: PROVIDER_OPTIONS },
];

export function CreateServerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ui = useUiAdapter();
  const form = useCommandForm(
    createServer,
    {
      fields: serverFields,
      defaultValues: {
        name: "",
        host: "",
        region: "Frankfurt",
        provider: "Hetzner",
      },
    },
    {
      entity: serversEntity.collection,
      onSettled: (result) => {
        if (result?.status === "ok") onOpenChange(false);
      },
    },
  );

  return (
    <ui.Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add server"
      description="The demo registers a fake server; no SSH connection is attempted."
      size="md"
    >
      <FormView
        form={form}
        fields={serverFields}
        submitLabel="Add server"
        cancel={() => onOpenChange(false)}
      />
    </ui.Dialog>
  );
}
