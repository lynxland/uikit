import type { DialogSize } from "@lynxland/uikit-surfaces/adapter";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { cx } from "./cx";
import { X } from "./icons";

export interface ModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  size: DialogSize;
  kind: "dialog" | "drawer";
  side?: "left" | "right";
  className?: string;
}

/**
 * Shared controlled modal shell for Dialog and Drawer.
 *
 * Implemented without a portal: the overlay is `position: fixed`, so it still
 * covers the viewport. This keeps the adapter dependency-free and easy to
 * test. Trade-offs are deliberate:
 * - Escape closes; backdrop press closes; the close button always exists.
 * - Initial focus moves to the panel, but there is no full focus trap and no
 *   focus restoration on unmount.
 * - Scroll locking and enter/exit animations are left to the consumer.
 * A production adapter should add a portal and focus trap; the UiAdapter
 * contract does not require either.
 */
export function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  size,
  kind,
  side = "right",
  className,
}: ModalShellProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const panel = panelRef.current;
      if (panel !== null && event.target instanceof Node && !panel.contains(event.target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const drawer = kind === "drawer";

  return (
    <div className="ui-plain-modal-overlay" data-slot="modal-overlay">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title !== undefined ? titleId : undefined}
        aria-describedby={description !== undefined ? descriptionId : undefined}
        tabIndex={-1}
        className={cx(
          "ui-plain-modal-panel",
          drawer
            ? cx(
                "ui-plain-drawer-panel",
                `ui-plain-drawer-panel--${side}`,
                `ui-plain-drawer-panel--${size}`,
              )
            : cx("ui-plain-dialog-panel", `ui-plain-dialog-panel--${size}`),
          className,
        )}
        data-slot={kind}
        data-size={size}
        data-side={drawer ? side : undefined}
      >
        <button
          type="button"
          className="ui-plain-icon-button ui-plain-modal-close"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X size={16} />
        </button>
        {title !== undefined ? (
          <h2 id={titleId} className="ui-plain-modal-title">
            {title}
          </h2>
        ) : null}
        {description !== undefined ? (
          <p id={descriptionId} className="ui-plain-modal-description">
            {description}
          </p>
        ) : null}
        {children !== undefined ? <div className="ui-plain-modal-body">{children}</div> : null}
        {footer !== undefined ? <div className="ui-plain-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
