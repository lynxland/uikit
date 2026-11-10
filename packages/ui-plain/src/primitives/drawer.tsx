import type { DrawerProps } from "@lynxland/uikit-surfaces/adapter";
import { ModalShell } from "./modal-shell";

/** Controlled side drawer; see ModalShell for the behavioural limits. */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  side = "right",
  size = "md",
}: DrawerProps) {
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
      size={size}
      kind="drawer"
      side={side}
    >
      {children}
    </ModalShell>
  );
}
