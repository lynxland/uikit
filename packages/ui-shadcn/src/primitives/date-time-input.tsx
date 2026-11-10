import type { DateTimeInputProps } from "@lynxland/uikit-surfaces/adapter";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cx } from "./cx";
import { fieldControl } from "./input";
import { Popover } from "./popover";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const HOURS = Array.from({ length: 24 }, (_, value) => value);
const MINUTES = Array.from({ length: 60 }, (_, value) => value);

function parseValue(value: string | undefined): Date | null {
  if (value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function formatDisplay(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function withDate(base: Date | null, day: Date): Date {
  const time = base ?? new Date();
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time.getHours(),
    time.getMinutes(),
  );
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Styled date-time picker for the default adapter. The value stays in the
 * native `datetime-local` string shape (`YYYY-MM-DDTHH:mm`), but the calendar
 * and time controls are rendered by uikit instead of the browser popup.
 */
export function DateTimeInput({
  value,
  onChange,
  id,
  disabled,
  placeholder = "Pick a date & time",
  min,
  max,
  className,
  "aria-label": ariaLabel,
}: DateTimeInputProps) {
  const selected = useMemo(() => parseValue(value), [value]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => startOfMonth(selected ?? new Date()));
  const today = new Date();

  const minDate = parseValue(min);
  const maxDate = parseValue(max);

  const dayDisabled = (day: Date): boolean => {
    if (minDate !== null && day.getTime() < new Date(minDate).setHours(0, 0, 0, 0)) return true;
    if (maxDate !== null && day.getTime() > new Date(maxDate).setHours(23, 59, 59, 999))
      return true;
    return false;
  };

  const first = startOfMonth(month);
  const startWeekday = (first.getDay() + 6) % 7; // Monday-first
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first.getFullYear(), first.getMonth(), 1 - startWeekday + index);
    return day;
  });

  const setDatePart = (day: Date): void => {
    onChange?.(formatValue(withDate(selected, day)));
  };

  const setTimePart = (hours: number, minutes: number): void => {
    const base = selected ?? new Date();
    const next = new Date(base);
    next.setHours(hours, minutes, 0, 0);
    onChange?.(formatValue(next));
  };

  const selectTime = selected ?? new Date();

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setMonth(startOfMonth(selected ?? new Date()));
      }}
      align="start"
      trigger={
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cx(
            fieldControl,
            "h-9 items-center justify-between gap-2 text-left font-normal disabled:cursor-not-allowed",
            selected === null && "text-[var(--muted-foreground)]",
            className,
          )}
        >
          <span className="truncate">
            {selected !== null ? formatDisplay(selected) : placeholder}
          </span>
          <CalendarDays className="size-4 shrink-0 opacity-60" />
        </button>
      }
    >
      <div className="space-y-3" data-testid="datetime-input-panel">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            className="inline-flex size-7 items-center justify-center rounded-md hover:bg-[var(--accent)]"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="text-sm font-medium">
            {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}
          </div>
          <button
            type="button"
            aria-label="Next month"
            className="inline-flex size-7 items-center justify-center rounded-md hover:bg-[var(--accent)]"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--muted-foreground)]">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day) => {
            const inMonth = day.getMonth() === month.getMonth();
            const isSelected = selected !== null && sameDay(day, selected);
            const isToday = sameDay(day, today);
            const isDisabled = dayDisabled(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                data-date={`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`}
                disabled={isDisabled}
                aria-pressed={isSelected}
                aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(day)}
                className={cx(
                  "inline-flex size-8 items-center justify-center rounded-md text-xs transition-colors",
                  "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
                  !inMonth && "text-[var(--muted-foreground)] opacity-45",
                  isToday && !isSelected && "border border-[var(--border)]",
                  isSelected && "bg-[var(--primary)] font-medium text-[var(--primary-foreground)]",
                  isDisabled && "pointer-events-none opacity-30",
                )}
                onClick={() => setDatePart(day)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3">
          <span className="text-xs text-[var(--muted-foreground)]">Time</span>
          <select
            aria-label="Hour"
            className="h-8 rounded-md border border-[var(--input)] bg-[var(--background)] px-2 text-xs"
            value={selectTime.getHours()}
            onChange={(event) => setTimePart(Number(event.target.value), selectTime.getMinutes())}
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {pad(hour)}
              </option>
            ))}
          </select>
          <span className="text-[var(--muted-foreground)]">:</span>
          <select
            aria-label="Minute"
            className="h-8 rounded-md border border-[var(--input)] bg-[var(--background)] px-2 text-xs"
            value={selectTime.getMinutes()}
            onChange={(event) => setTimePart(selectTime.getHours(), Number(event.target.value))}
          >
            {MINUTES.map((minute) => (
              <option key={minute} value={minute}>
                {pad(minute)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            onClick={() => {
              onChange?.(undefined);
              setOpen(false);
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs font-medium hover:bg-[var(--accent)]"
            onClick={() => {
              const now = new Date();
              onChange?.(formatValue(now));
              setMonth(startOfMonth(now));
            }}
          >
            Now
          </button>
        </div>
      </div>
    </Popover>
  );
}
