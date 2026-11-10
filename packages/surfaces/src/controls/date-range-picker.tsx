import type { ReactNode } from "react";
import { useId, useState } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

/** Date-only range (`YYYY-MM-DD`); either endpoint may be open. */
export interface DateRangeValue {
  start?: string;
  end?: string;
}

export interface DateRangePreset extends DateRangeValue {
  /** Optional stable key; defaults to the start/end pair. */
  id?: string;
  label: ReactNode;
}

export interface DateRangePickerProps {
  start?: string;
  end?: string;
  onChange: (value: DateRangeValue) => void;
  presets?: readonly DateRangePreset[];
  /** Overrides the formatted range label on the trigger. */
  triggerLabel?: ReactNode;
  placeholder?: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  "aria-label"?: string;
}

function parseDate(value: string | undefined): Date | null {
  if (value === undefined || value === "") return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDate(value: string | undefined): string | undefined {
  const date = parseDate(value);
  if (date === null) return undefined;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function rangeLabel(start: string | undefined, end: string | undefined): string | undefined {
  const from = formatDate(start);
  const to = formatDate(end);
  if (from !== undefined && to !== undefined) return `${from} - ${to}`;
  if (from !== undefined) return `From ${from}`;
  if (to !== undefined) return `Until ${to}`;
  return undefined;
}

/**
 * Controlled date-only range picker. The value stays as two `YYYY-MM-DD`
 * strings (no Date objects, no calendar dependency); the adapter `Input`
 * renders the native date field and the adapter `Popover` owns the panel.
 * Presets are plain data and report through the same `onChange`.
 */
export function DateRangePicker({
  start,
  end,
  onChange,
  presets = [],
  triggerLabel,
  placeholder = "Select date range",
  align = "start",
  className,
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const [open, setOpen] = useState(false);
  const startId = useId();
  const endId = useId();
  const label = triggerLabel ?? rangeLabel(start, end) ?? placeholder;

  return (
    <ui.Popover
      open={open}
      onOpenChange={setOpen}
      align={align}
      trigger={
        <ui.Button
          type="button"
          variant="outline"
          size="sm"
          className={merge("ui-date-range-picker", className)}
          aria-label={ariaLabel}
          data-testid="date-range-picker"
        >
          {label}
        </ui.Button>
      }
      className="ui-date-range-picker__popover"
    >
      <div className="ui-date-range-picker__panel">
        <div className="ui-date-range-picker__fields">
          <label className="ui-date-range-picker__field" htmlFor={startId}>
            <span>Start date</span>
            <ui.Input
              id={startId}
              type="date"
              value={start ?? ""}
              data-testid="date-range-start"
              onChange={(event) =>
                onChange({
                  start: event.target.value === "" ? undefined : event.target.value,
                  end,
                })
              }
            />
          </label>
          <label className="ui-date-range-picker__field" htmlFor={endId}>
            <span>End date</span>
            <ui.Input
              id={endId}
              type="date"
              value={end ?? ""}
              data-testid="date-range-end"
              onChange={(event) =>
                onChange({
                  start,
                  end: event.target.value === "" ? undefined : event.target.value,
                })
              }
            />
          </label>
        </div>

        {presets.length > 0 ? (
          // biome-ignore lint/a11y/useSemanticElements: presets are a labelled button group, not a form fieldset
          <div
            className="ui-date-range-picker__presets"
            role="group"
            aria-label="Date range presets"
          >
            {presets.map((preset, index) => (
              <ui.Button
                key={preset.id ?? `${preset.start ?? ""}..${preset.end ?? ""}`}
                type="button"
                variant="ghost"
                size="sm"
                data-testid={`date-range-preset-${index}`}
                onClick={() => {
                  onChange({ start: preset.start, end: preset.end });
                  setOpen(false);
                }}
              >
                {preset.label}
              </ui.Button>
            ))}
          </div>
        ) : null}

        <div className="ui-date-range-picker__actions">
          <ui.Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange({ start: undefined, end: undefined });
              setOpen(false);
            }}
          >
            Clear
          </ui.Button>
        </div>
      </div>
    </ui.Popover>
  );
}
