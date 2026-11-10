import { type ReactNode, useState } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "./classes";

export interface JsonFieldProps {
  value: unknown;
  /** Providing onChange makes the field editable; omit for a read-only view. */
  onChange?: (next: unknown) => void;
  label?: ReactNode;
  serialize?: (value: unknown) => string;
  className?: string;
}

const defaultSerialize = (value: unknown): string => JSON.stringify(value ?? null, null, 2);

/**
 * Structured value in view/edit modes. Invalid JSON never writes back:
 * `onChange` only receives a successfully parsed value, and the editor stays
 * open with the error until the draft becomes valid or the user cancels.
 */
export function JsonField({ value, onChange, label, serialize, className }: JsonFieldProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const stringify = serialize ?? defaultSerialize;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(stringify(value));
    setError(null);
    setEditing(true);
  };

  const apply = () => {
    try {
      const parsed: unknown = JSON.parse(draft);
      onChange?.(parsed);
      setError(null);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid JSON");
    }
  };

  return (
    <div className={merge("ui-json", className)} data-testid="json-field">
      {label !== undefined ? <div className="ui-json__label">{label}</div> : null}
      {editing ? (
        <div className="ui-json__editor">
          <ui.Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={Math.min(16, Math.max(4, draft.split("\n").length + 1))}
            spellCheck={false}
            aria-label={typeof label === "string" ? label : "JSON value"}
            data-testid="json-field-input"
            className="ui-json__input"
          />
          {error !== null ? (
            <p className="ui-json__error" role="alert" data-testid="json-field-error">
              {error}
            </p>
          ) : null}
          <div className="ui-json__actions">
            <ui.Button size="sm" type="button" onClick={apply} data-testid="json-field-apply">
              <ui.icons.Check size={14} aria-hidden="true" /> Apply
            </ui.Button>
            <ui.Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              <ui.icons.X size={14} aria-hidden="true" /> Cancel
            </ui.Button>
          </div>
        </div>
      ) : (
        <div className="ui-json__view">
          <pre className="ui-json__pre">{stringify(value)}</pre>
          {onChange !== undefined ? (
            <ui.Button
              size="sm"
              type="button"
              variant="outline"
              onClick={startEdit}
              data-testid="json-field-edit"
            >
              Edit
            </ui.Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
