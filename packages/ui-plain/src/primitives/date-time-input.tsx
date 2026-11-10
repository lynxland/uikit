import type { DateTimeInputProps } from "@lynxland/uikit-surfaces/adapter";

/**
 * Minimal fallback: native `datetime-local` kept inside the plain adapter.
 * It is intentionally not a full calendar; use ui-shadcn or a custom adapter
 * for the styled popover.
 */
export function DateTimeInput({
  value,
  onChange,
  id,
  disabled,
  placeholder,
  min,
  max,
  className,
  "aria-label": ariaLabel,
}: DateTimeInputProps) {
  return (
    <input
      id={id}
      type="datetime-local"
      className={["ui-plain-input", className].filter(Boolean).join(" ")}
      value={value ?? ""}
      disabled={disabled}
      placeholder={placeholder}
      min={min}
      max={max}
      aria-label={ariaLabel}
      onChange={(event) => onChange?.(event.target.value === "" ? undefined : event.target.value)}
    />
  );
}
