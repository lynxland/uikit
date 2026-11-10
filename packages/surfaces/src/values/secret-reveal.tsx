import type { ReactNode } from "react";
import { cx } from "./classes";
import { CopyButton } from "./copy-button";

export interface SecretRevealProps {
  value: string;
  caption?: ReactNode;
  copyLabel?: string;
  className?: string;
}

/**
 * One-shot secret reveal (tokens, invite links). The value arrives through a
 * command result payload; this view only renders it and offers copying.
 */
export function SecretReveal({ value, caption, copyLabel, className }: SecretRevealProps) {
  return (
    <div className={cx("ui-secret", className)} role="note">
      <div className="ui-secret__row">
        <code className="ui-secret__code">{value}</code>
        <CopyButton value={value} label={copyLabel} />
      </div>
      <p className="ui-secret__caption">{caption ?? "Copy it now — it will not be shown again."}</p>
    </div>
  );
}
