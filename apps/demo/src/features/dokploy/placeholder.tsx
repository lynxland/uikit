import { EmptyState, PageLayout } from "@lynxland/uikit-surfaces";
import type { ReactNode } from "react";
import { DokployCard } from "@/components/page-card";

/**
 * Real route + honest empty state for Dokploy sections this clone does not
 * implement. No fake tables or buttons that do nothing.
 */
export function DokployPlaceholderPage({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <DokployCard>
      <PageLayout width="flow" titleSize="lg" title={title} description={description}>
        <EmptyState
          icon={icon}
          title="Not implemented in this clone"
          description="The navigation entry is real and testable; the feature behind it is intentionally out of scope for the strict Dokploy UI clone."
        />
      </PageLayout>
    </DokployCard>
  );
}
