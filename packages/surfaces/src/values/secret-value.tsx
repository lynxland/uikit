import { useState } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "./classes";
import { CopyButton } from "./copy-button";

export interface SecretValueProps {
  value: string;
  /** Accessible label for reveal/copy actions (for example "API key"). */
  label?: string;
  /** Mask the value until revealed; default true. */
  masked?: boolean;
  defaultRevealed?: boolean;
  className?: string;
  /** Optional test id for the root cell. */
  testId?: string;
}

/**
 * Row-level secret value: masked by default, with reveal/copy actions.
 * `SecretReveal` stays the one-shot command-result view; this is the inline
 * table/cell/field primitive.
 */
export function SecretValue({
  value,
  label = "secret",
  masked = true,
  defaultRevealed = false,
  className,
  testId,
}: SecretValueProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const [revealed, setRevealed] = useState(() => !masked || defaultRevealed);

  return (
    <span
      className={merge("ui-secret-value", className)}
      data-secret-value="true"
      {...(testId !== undefined ? { "data-testid": testId } : {})}
    >
      <code className="ui-secret-value__code">
        {revealed ? value : "••••••••••••"}
      </code>
      {masked ? (
        <ui.Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
          aria-pressed={revealed}
          onClick={() => setRevealed((current) => !current)}
        >
          {revealed ? (
            <ui.icons.EyeOff size={14} aria-hidden="true" />
          ) : (
            <ui.icons.Eye size={14} aria-hidden="true" />
          )}
        </ui.Button>
      ) : null}
      <CopyButton value={value} label={`Copy ${label}`} />
    </span>
  );
}
