import type { CSSProperties, ReactNode, UIEvent } from "react";
import { useMemo, useRef } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "./classes";

export type CodeEditorLanguage = "text" | "properties" | "yaml" | "json" | "shell" | "compose";

export interface CodeEditorRenderProps {
  value: string;
  onChange: (value: string) => void;
  language: CodeEditorLanguage;
  readOnly: boolean;
  masked: boolean;
  placeholder?: string;
  minHeight?: number | string;
}

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  /** Metadata only: surfaces has no syntax engine. A custom `render` can read it. */
  language?: CodeEditorLanguage;
  /** Show a line-number gutter aligned to logical lines (default true). */
  lineNumbers?: boolean;
  /** Soft-wrap long lines. Default false so the gutter and masked overlay stay aligned. */
  wrap?: boolean;
  readOnly?: boolean;
  /**
   * Mask the contents. The underlying `value` never changes: reveal/hide only
   * swaps the presentation.
   */
  masked?: boolean;
  /** When supplied, a reveal/hide button is rendered and this receives its state. */
  onMaskedChange?: (masked: boolean) => void;
  minHeight?: number | string;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  /** Escape hatch: replace the textarea with an editor integration (CodeMirror, Monaco…). */
  render?: (props: CodeEditorRenderProps) => ReactNode;
  /** Test id applied to the textarea (ignored by a custom `render`). */
  testId?: string;
}

const DEFAULT_MIN_HEIGHT = 160;

function maskValue(value: string): string {
  // Keep whitespace so line breaks, tabs and wrapped indentation stay aligned.
  return value.replace(/[^\s]/g, "•");
}

/**
 * Dependency-free code editor surface: textarea + line-number gutter, with
 * optional masked editing. Masking uses an aria-hidden dot overlay (the
 * textarea text is transparent), so the draft is preserved and reveal never
 * rewrites the value. A consumer that needs real highlighting passes `render`.
 */
export function CodeEditor({
  value,
  onChange,
  language = "text",
  lineNumbers = true,
  wrap = false,
  readOnly = false,
  masked = false,
  onMaskedChange,
  minHeight = DEFAULT_MIN_HEIGHT,
  placeholder,
  "aria-label": ariaLabel,
  className,
  render,
  testId,
}: CodeEditorProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const maskClipRef = useRef<HTMLDivElement | null>(null);

  const lineCount = useMemo(() => Math.max(value.split("\n").length, 1), [value]);
  const gutterDigits = Math.max(String(lineCount).length, 2);
  const gutterWidth = `calc(${gutterDigits + 1}ch + 1rem)`;

  const handleChange = (next: string) => {
    onChange?.(next);
  };

  if (render !== undefined) {
    return (
      <div
        className={merge("ui-code-editor ui-code-editor--custom", className)}
        data-language={language}
        data-masked={masked ? "true" : undefined}
      >
        {render({
          value,
          onChange: handleChange,
          language,
          readOnly,
          masked,
          ...(placeholder !== undefined ? { placeholder } : {}),
          ...(minHeight !== undefined ? { minHeight } : {}),
        })}
      </div>
    );
  }

  const surfaceStyle: CSSProperties = { minHeight };

  return (
    <div
      className={merge("ui-code-editor", className)}
      data-language={language}
      data-masked={masked ? "true" : undefined}
      data-readonly={readOnly ? "true" : undefined}
      data-wrap={wrap ? "true" : undefined}
    >
      {lineNumbers ? (
        <div
          ref={gutterRef}
          className="ui-code-editor__gutter"
          style={{ width: gutterWidth }}
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, index) => String(index + 1)).join("\n")}
        </div>
      ) : null}
      <div className="ui-code-editor__surface" style={surfaceStyle}>
        <textarea
          className={merge("ui-code-editor__input", masked && "ui-code-editor__input--masked")}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          aria-label={ariaLabel}
          data-testid={testId}
          data-masked={masked ? "true" : undefined}
          wrap={wrap ? "soft" : "off"}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(event) => handleChange(event.target.value)}
          onScroll={(event: UIEvent<HTMLTextAreaElement>) => {
            const input = event.currentTarget;
            if (gutterRef.current !== null) gutterRef.current.scrollTop = input.scrollTop;
            if (maskClipRef.current !== null) {
              maskClipRef.current.scrollTop = input.scrollTop;
              maskClipRef.current.scrollLeft = input.scrollLeft;
            }
          }}
        />
        {masked ? (
          <div ref={maskClipRef} className="ui-code-editor__mask-clip" aria-hidden="true">
            <pre className="ui-code-editor__mask">{maskValue(value)}</pre>
          </div>
        ) : null}
      </div>
      {onMaskedChange !== undefined ? (
        <ui.Button
          type="button"
          variant="ghost"
          size="icon"
          className="ui-code-editor__reveal"
          aria-label={masked ? "Reveal contents" : "Hide contents"}
          aria-pressed={!masked}
          onClick={() => onMaskedChange(!masked)}
        >
          {masked ? (
            <ui.icons.Eye size={14} aria-hidden="true" />
          ) : (
            <ui.icons.EyeOff size={14} aria-hidden="true" />
          )}
        </ui.Button>
      ) : null}
    </div>
  );
}
