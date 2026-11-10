import { useLookup } from "@lynxland/uikit-react";
import { useMemo } from "react";
import { type SelectOption, useUiAdapter } from "../adapter";
import { cx } from "../values/classes";
import type { FieldReference } from "./types";

export interface ReferenceInputProps {
  reference: FieldReference;
  value?: string | null;
  onChange: (value: string | undefined) => void;
  /**
   * Candidate options supplied by the caller (usually from a search query).
   * `useLookup` only resolves the currently selected id; it is not a search
   * engine, and fetching stays outside the control.
   */
  options?: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * Reference picker wired to a `LookupSource`. The current value is resolved
 * through `useLookup` so the select can show a label even when the option page
 * that produced it is no longer in memory. Options themselves come from props.
 */
export function ReferenceInput({
  reference,
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  disabled = false,
  loading = false,
  allowClear = false,
  clearLabel = "Clear",
  id,
  "aria-label": ariaLabel,
  className,
}: ReferenceInputProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const ids = value !== undefined && value !== null && value !== "" ? [value] : [];
  const lookup = useLookup(reference.source, ids);
  const current = value !== undefined && value !== null && value !== "" ? value : undefined;
  const currentRow = current !== undefined ? lookup.byId.get(current) : undefined;

  const merged = useMemo(() => {
    const resolved: SelectOption[] = [...options];
    if (current !== undefined && !resolved.some((option) => option.value === current)) {
      resolved.push({
        value: current,
        label:
          currentRow !== undefined
            ? reference.getLabel(currentRow)
            : lookup.status === "loading"
              ? `${current} (loading…)`
              : current,
        disabled: lookup.status === "loading",
      });
    }
    if (allowClear) {
      resolved.unshift({ value: "", label: clearLabel });
    }
    return resolved;
  }, [options, current, currentRow, lookup.status, allowClear, clearLabel, reference]);

  return (
    <span className={merge("ui-reference-input", className)} data-status={lookup.status}>
      <ui.Select
        value={current ?? ""}
        options={merged}
        placeholder={loading ? "Loading…" : placeholder}
        disabled={disabled || loading}
        {...(id !== undefined ? { id } : {})}
        {...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {})}
        onValueChange={(next) => onChange(next === "" ? undefined : next)}
      />
    </span>
  );
}
