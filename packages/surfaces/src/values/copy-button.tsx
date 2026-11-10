import { useEffect, useRef, useState } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "./classes";

export type CopyState = "idle" | "copied" | "failed";

export interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  failedLabel?: string;
  /** How long the success/failure state stays visible (ms). */
  feedbackMs?: number;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
  onCopy?: (value: string) => void;
}

async function writeClipboard(value: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText !== undefined) {
    await navigator.clipboard.writeText(value);
    return;
  }
  if (typeof document === "undefined") throw new Error("Clipboard is unavailable");
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    const copied = document.execCommand("copy");
    if (!copied) throw new Error("Copy command was rejected");
  } finally {
    document.body.removeChild(area);
  }
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  failedLabel = "Copy failed",
  feedbackMs = 1500,
  variant = "ghost",
  size = "icon",
  className,
  onCopy,
}: CopyButtonProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const settle = (next: CopyState) => {
    setState(next);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), feedbackMs);
  };

  const icon =
    state === "copied" ? (
      <ui.icons.Check size={14} aria-hidden="true" />
    ) : state === "failed" ? (
      <ui.icons.X size={14} aria-hidden="true" />
    ) : (
      <ui.icons.Copy size={14} aria-hidden="true" />
    );

  return (
    <ui.Button
      type="button"
      variant={variant}
      size={size}
      className={merge("ui-copy-button", className)}
      aria-label={state === "copied" ? copiedLabel : state === "failed" ? failedLabel : label}
      title={state === "copied" ? copiedLabel : state === "failed" ? failedLabel : label}
      data-state={state}
      onClick={() => {
        void writeClipboard(value).then(
          () => {
            settle("copied");
            onCopy?.(value);
          },
          () => settle("failed"),
        );
      }}
    >
      {icon}
    </ui.Button>
  );
}
