import type { SelectProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";
import { ChevronDown } from "./icons";

/**
 * Native `<select>`: no popup positioning, focus trapping or custom
 * type-ahead — the browser owns all of it. The wrapper only adds a chevron
 * indicator. This is the minimal-adapter trade-off: full a11y for free, but
 * options cannot render rich content.
 *
 * `contentClassName` is applied to the native `<select>` because the browser
 * owns the popup; `className` styles the wrapper (width escapes).
 */
export function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  disabled = false,
  id,
  size = "md",
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: SelectProps) {
  return (
    <span
      className={cx("ui-plain-select-wrap", `ui-plain-select-wrap--${size}`, className)}
      data-slot="select"
      data-size={size}
    >
      <select
        id={id}
        aria-label={ariaLabel}
        className={cx("ui-plain-select", contentClassName)}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        data-disabled={disabled || undefined}
        onChange={(event) => onValueChange?.(event.currentTarget.value)}
      >
        {placeholder !== undefined ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="ui-plain-select-icon" size={16} />
    </span>
  );
}
