import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { DialogProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";
import { X } from "./icons";

const sizeClass = {
  sm: "w-[calc(100%-2rem)] max-h-[85vh] sm:max-w-sm",
  md: "w-[calc(100%-2rem)] max-h-[85vh] sm:max-w-lg",
  lg: "w-[calc(100%-2rem)] max-h-[85vh] sm:max-w-2xl",
  xl: "w-[calc(100%-2rem)] max-h-[85vh] sm:max-w-[64rem]",
  fullscreen: "h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-h-none max-w-none rounded-lg",
} as const;

/**
 * Controlled modal dialog. Portal, backdrop, focus trap, escape handling and
 * ARIA title/description wiring stay inside the adapter.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  size = "md",
  className,
}: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <BaseDialog.Popup
          className={cx(
            "fixed left-1/2 top-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-[var(--border)] bg-[var(--popover)] p-6 text-[var(--popover-foreground)] shadow-lg outline-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            sizeClass[size],
            className,
          )}
          data-slot="dialog"
          data-size={size}
        >
          <BaseDialog.Close
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <X size={16} />
          </BaseDialog.Close>
          {title !== undefined ? (
            <BaseDialog.Title className="pr-8 text-lg font-semibold leading-none tracking-tight">
              {title}
            </BaseDialog.Title>
          ) : null}
          {description !== undefined ? (
            <BaseDialog.Description className="mt-2 text-sm text-[var(--muted-foreground)]">
              {description}
            </BaseDialog.Description>
          ) : null}
          {children !== undefined ? (
            <div className="mt-4 min-h-0 overflow-y-auto">{children}</div>
          ) : null}
          {footer !== undefined ? (
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {footer}
            </div>
          ) : null}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
