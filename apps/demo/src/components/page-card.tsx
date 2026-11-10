import { cx } from "@lynxland/uikit-surfaces";
import type { ReactNode } from "react";

/**
 * Dokploy's page frame: a `--ui-sidebar` rail with p-2.5 around an inner
 * `rounded-xl bg-background shadow-md` surface. PageLayout renders inside the
 * inner surface, so the h1 stays a chrome concern.
 *
 * `fill` keeps the panel at least viewport height (Home, Projects, service
 * screens); settings pages opt out so their card is content-sized.
 */
export function DokployCard({
  children,
  className,
  innerClassName,
  fill = true,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  fill?: boolean;
}) {
  return (
    <div
      className={cx("rounded-xl bg-[var(--ui-sidebar)] p-2.5", className)}
      data-testid="dokploy-page-card"
    >
      <div
        className={cx(
          "dokploy-page flex flex-col overflow-hidden rounded-xl",
          fill && "min-h-[calc(100dvh-7.5rem)]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
