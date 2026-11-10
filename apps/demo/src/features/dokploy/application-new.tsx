import { FormPage } from "@lynxland/uikit-preset-console";
import { useCollection, useRecord } from "@lynxland/uikit-react";
import { EmptyState, ErrorState, LoadingState, useUiAdapter } from "@lynxland/uikit-surfaces";
import { Link, useNavigate } from "@tanstack/react-router";
import { DokployCard } from "@/components/page-card";
import {
  createApplication,
  environmentOf,
  projectsEntity,
  serversEntity,
  servicesEntity,
} from "@/lib/dokploy";
import { createApplicationDefaults, createApplicationFields } from "./forms";

export function DokployApplicationNewPage({
  projectId,
  environmentId,
}: {
  projectId: string;
  environmentId: string;
}) {
  const ui = useUiAdapter();
  const navigate = useNavigate();
  const project = useRecord(projectsEntity.record!, projectId);
  const servers = useCollection(serversEntity.collection!, { window: { kind: "all" } });
  const environment = environmentOf(environmentId);

  if (project.status === "loading" || project.status === "idle") {
    return (
      <DokployCard>
        <div className="p-6">
          <LoadingState rows={4} label="Loading project" />
        </div>
      </DokployCard>
    );
  }

  if (project.status === "error") {
    return (
      <DokployCard>
        <div className="p-6">
          <ErrorState error={project.error} onRetry={project.refetch} />
        </div>
      </DokployCard>
    );
  }

  if (
    project.data === undefined ||
    environment === undefined ||
    environment.projectId !== projectId
  ) {
    return (
      <DokployCard>
        <div className="p-6">
          <EmptyState
            title="Project or environment not found"
            description={`No project/environment combination exists for ${projectId} / ${environmentId}.`}
            action={
              <ui.Button asChild variant="outline" size="sm">
                <Link to="/dashboard/projects">Back to projects</Link>
              </ui.Button>
            }
          />
        </div>
      </DokployCard>
    );
  }

  const fields = createApplicationFields(servers.rows);

  return (
    <DokployCard>
      <FormPage
        title={`New application · ${project.data.name}`}
        description={`Create an application in the ${environment.name} environment. This page and the dialog host call the same command.`}
        width="flow"
        command={createApplication}
        entity={servicesEntity.collection}
        fields={fields}
        defaultValues={createApplicationDefaults(projectId, environmentId, servers.rows)}
        submitLabel="Create application"
        cancel={
          <ui.Button asChild variant="outline" size="sm">
            <Link
              to="/dashboard/project/$projectId/environment/$environmentId"
              params={{ projectId, environmentId }}
            >
              Back to environment
            </Link>
          </ui.Button>
        }
        onSuccess={(service) => {
          void navigate({
            to: "/dashboard/project/$projectId/environment/$environmentId/services/application/$applicationId",
            params: { projectId, environmentId, applicationId: service.id },
          });
        }}
      />
    </DokployCard>
  );
}
