import type { DialogProps } from "@lynxland/uikit-surfaces/adapter";
import { ModalShell } from "./modal-shell";

/** Controlled modal dialog; see ModalShell for the behavioural limits. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  size = "md",
}: DialogProps) {
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
      size={size}
      kind="dialog"
    >
      {children}
    </ModalShell>
  );
}
