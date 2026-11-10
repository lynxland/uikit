import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import type { DrawerProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";
import { X } from "./icons";

const sizeClass = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-[64rem]",
  fullscreen: "sm:max-w-none",
} as const;

/**
 * Controlled side drawer. Base UI provides portal/focus/escape/swipe
 * behaviour; the adapter only maps `side`/`size` to presentation.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  side = "right",
  size = "md",
  className,
}: DrawerProps) {
  return (
    <BaseDrawer.Root
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
      swipeDirection={side === "left" ? "left" : "right"}
    >
      <BaseDrawer.Portal>
        <BaseDrawer.Backdrop className="fixed inset-0 z-40 bg-black/50 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <BaseDrawer.Viewport
          className={cx(
            "fixed inset-0 z-50 flex",
            side === "left" ? "justify-start" : "justify-end",
          )}
        >
          <BaseDrawer.Popup
            className={cx(
              "relative flex h-dvh w-full flex-col border-[var(--border)] bg-[var(--popover)] p-6 text-[var(--popover-foreground)] shadow-lg outline-none",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              side === "left" ? "border-r" : "border-l",
              sizeClass[size],
              className,
            )}
            data-slot="drawer"
            data-side={side}
            data-size={size}
          >
            <BaseDrawer.Close
              type="button"
              aria-label="Close"
              className="absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <X size={16} />
            </BaseDrawer.Close>
            {title !== undefined ? (
              <BaseDrawer.Title className="pr-8 text-lg font-semibold leading-none tracking-tight">
                {title}
              </BaseDrawer.Title>
            ) : null}
            {description !== undefined ? (
              <BaseDrawer.Description className="mt-2 text-sm text-[var(--muted-foreground)]">
                {description}
              </BaseDrawer.Description>
            ) : null}
            {children !== undefined ? (
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto">{children}</div>
            ) : null}
            {footer !== undefined ? (
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {footer}
              </div>
            ) : null}
          </BaseDrawer.Popup>
        </BaseDrawer.Viewport>
      </BaseDrawer.Portal>
    </BaseDrawer.Root>
  );
}
