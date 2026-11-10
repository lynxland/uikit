import {
  cloneElement,
  type FieldsetHTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

export interface InputGroupProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "children"> {
  /** The input/textarea control. It is rendered inside the group frame. */
  children: ReactNode;
  startAddon?: ReactNode;
  endAddon?: ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  /** Class for the inner control slot (rarely needed). */
  controlClassName?: string;
}

function forwardState(
  child: ReactNode,
  disabled: boolean | undefined,
  invalid: boolean | undefined,
): ReactNode {
  if ((disabled === undefined && invalid === undefined) || !isValidElement(child)) return child;
  const extra: Record<string, unknown> = {};
  if (disabled !== undefined) extra.disabled = disabled;
  if (invalid !== undefined) extra["aria-invalid"] = invalid ? true : undefined;
  return cloneElement(child as ReactElement<Record<string, unknown>>, extra);
}

/**
 * Frame + addon slots around a single input/textarea. Use the adapter's
 * `variant="bare"` control so the group owns the border and focus ring:
 *
 * ```tsx
 * <InputGroup endAddon={<CopyButton value={url} />}>
 *   <ui.Input variant="bare" value={url} readOnly aria-label="URL" />
 * </InputGroup>
 * ```
 *
 * `disabled`/`invalid` propagate to the direct control and the group state
 * (`data-disabled`, `data-invalid`, `aria-disabled`).
 */
export function InputGroup({
  children,
  startAddon,
  endAddon,
  invalid = false,
  disabled = false,
  controlClassName,
  className,
  ...rest
}: InputGroupProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const control = forwardState(children, disabled, invalid);

  return (
    <fieldset
      {...rest}
      className={merge("ui-input-group", className)}
      disabled={disabled}
      data-disabled={disabled ? "true" : undefined}
      data-invalid={invalid ? "true" : undefined}
      aria-disabled={disabled ? true : undefined}
    >
      {startAddon !== undefined ? (
        <span className="ui-input-group__addon" data-side="start">
          {startAddon}
        </span>
      ) : null}
      <span className={merge("ui-input-group__control", controlClassName)}>{control}</span>
      {endAddon !== undefined ? (
        <span className="ui-input-group__addon" data-side="end">
          {endAddon}
        </span>
      ) : null}
    </fieldset>
  );
}
