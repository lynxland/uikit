import type { FilterValue } from "@lynxland/uikit-core";
import { useEffect, useId, useState } from "react";
import { useUiAdapter } from "../adapter";
import { type FilterField, humanizeFieldName } from "../fields/types";
import { cx } from "../values/classes";

export interface FilterBarText {
  value: string;
  onChange: (value: string) => void;
}

export interface FilterBarClassNames {
  root?: string;
  search?: string;
  field?: string;
  options?: string;
  clear?: string;
}

export interface FilterBarProps {
  fields: readonly FilterField[];
  value: readonly FilterValue[];
  onChange: (value: readonly FilterValue[]) => void;
  text?: FilterBarText;
  placeholder?: string;
  clearLabel?: string;
  className?: string;
  classNames?: FilterBarClassNames;
}

function filterFor(value: readonly FilterValue[], field: string): FilterValue | undefined {
  return value.find((leaf) => leaf.field === field);
}

function stringValues(value: FilterValue["value"] | undefined): string[] {
  if (value === undefined) return [];
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  return [...value];
}

function replaceField(
  value: readonly FilterValue[],
  field: string,
  leaves: readonly FilterValue[],
): FilterValue[] {
  const rest = value.filter((leaf) => leaf.field !== field);
  return leaves.length === 0 ? rest : [...rest, ...leaves];
}

function inputId(prefix: string, field: string, suffix: string): string {
  return `${prefix}-${field.replace(/[^a-zA-Z0-9_-]/g, "-")}-${suffix}`;
}

/**
 * Controlled filter bar. `value` is the single source of truth; only free-text
 * inputs keep a transient draft (synced whenever `value` changes). Enum
 * multi-select uses the adapter Popover + Checkbox; no local complete draft
 * mirror and no schema introspection.
 */
export function FilterBar({
  fields,
  value,
  onChange,
  text,
  placeholder = "Search…",
  clearLabel = "Clear",
  className,
  classNames,
}: FilterBarProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const filterId = useId();
  const [openField, setOpenField] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState(text?.value ?? "");

  useEffect(() => {
    setTextDraft(text?.value ?? "");
  }, [text?.value]);

  const fieldNames = new Set(fields.map((field) => field.field));
  const hasActive = (text?.value ?? "") !== "" || value.some((leaf) => fieldNames.has(leaf.field));

  const setFieldLeaves = (field: string, leaves: readonly FilterValue[]) => {
    onChange(replaceField(value, field, leaves));
  };

  const clearAll = () => {
    onChange(value.filter((leaf) => !fieldNames.has(leaf.field)));
    text?.onChange("");
  };

  return (
    <div className={merge("ui-filter-bar", className, classNames?.root)} data-testid="filter-bar">
      {text !== undefined ? (
        <div className={merge("ui-filter-bar__search", classNames?.search)}>
          <ui.icons.Search className="ui-filter-bar__search-icon" size={14} aria-hidden="true" />
          <ui.Input
            className="ui-filter-bar__input ui-filter-bar__input--search"
            value={textDraft}
            placeholder={placeholder}
            aria-label="Search"
            data-testid="filter-search"
            onChange={(event) => {
              const next = event.target.value;
              setTextDraft(next);
              text.onChange(next);
            }}
          />
        </div>
      ) : null}

      {fields.map((field) => {
        const label = field.label ?? humanizeFieldName(field.field);
        const fieldClass = merge("ui-filter-bar__field", classNames?.field);

        if (field.kind === "enum") {
          const leaf = filterFor(value, field.field);
          const selected = stringValues(leaf?.value);
          const options = field.options ?? [];
          return (
            <div key={field.field} className={fieldClass} data-field={field.field}>
              <ui.Popover
                open={openField === field.field}
                onOpenChange={(open) => setOpenField(open ? field.field : null)}
                align="start"
                trigger={
                  <ui.Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-haspopup="dialog"
                    aria-expanded={openField === field.field}
                    data-testid={`filter-enum-${field.field}`}
                  >
                    {label}
                    {selected.length > 0 ? ` · ${selected.length}` : ""}
                    <ui.icons.ChevronDown size={12} aria-hidden="true" />
                  </ui.Button>
                }
              >
                <div className={merge("ui-filter-options", classNames?.options)}>
                  {options.map((option) => {
                    const id = inputId(filterId, field.field, option.value);
                    return (
                      <label key={option.value} className="ui-filter-option" htmlFor={id}>
                        <ui.Checkbox
                          id={id}
                          checked={selected.includes(option.value)}
                          onCheckedChange={() => {
                            const next = selected.includes(option.value)
                              ? selected.filter((candidate) => candidate !== option.value)
                              : [...selected, option.value];
                            setFieldLeaves(
                              field.field,
                              next.length === 0
                                ? []
                                : [
                                    {
                                      field: field.field,
                                      op: field.op ?? "in",
                                      value: next,
                                    },
                                  ],
                            );
                          }}
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </ui.Popover>
            </div>
          );
        }

        if (field.kind === "datetime") {
          if (field.as === "presets" && field.presets !== undefined) {
            return (
              <div key={field.field} className={fieldClass} data-field={field.field}>
                {field.presets.map((preset) => (
                  <ui.Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      const leaves: FilterValue[] = [
                        { field: field.field, op: "gte", value: preset.from(now) },
                      ];
                      const to = preset.to?.(now);
                      if (to !== undefined) {
                        leaves.push({ field: field.field, op: "lte", value: to });
                      }
                      setFieldLeaves(field.field, leaves);
                    }}
                  >
                    {preset.label}
                  </ui.Button>
                ))}
              </div>
            );
          }

          const gte = value.find((leaf) => leaf.field === field.field && leaf.op === "gte");
          const lte = value.find((leaf) => leaf.field === field.field && leaf.op === "lte");
          const update = (op: "gte" | "lte", nextValue: string | undefined) => {
            const current = value.filter((leaf) => leaf.field === field.field);
            const kept = current.filter((leaf) => leaf.op !== op);
            const next =
              nextValue === undefined || nextValue === ""
                ? kept
                : [...kept, { field: field.field, op, value: nextValue } satisfies FilterValue];
            setFieldLeaves(field.field, next);
          };
          return (
            <span key={field.field} className={fieldClass} data-field={field.field}>
              <ui.DateTimeInput
                className="ui-filter-bar__input ui-filter-bar__input--datetime"
                aria-label={`${label} from`}
                value={gte !== undefined ? String(gte.value) : ""}
                onChange={(next) => update("gte", next)}
              />
              <span className="ui-filter-bar__separator" aria-hidden="true">
                –
              </span>
              <ui.DateTimeInput
                className="ui-filter-bar__input ui-filter-bar__input--datetime"
                aria-label={`${label} to`}
                value={lte !== undefined ? String(lte.value) : ""}
                onChange={(next) => update("lte", next)}
              />
            </span>
          );
        }

        const op = field.op ?? (field.kind === "exact" ? "eq" : "contains");
        const current = filterFor(value, field.field);
        return (
          <div key={field.field} className={fieldClass} data-field={field.field}>
            <ui.Input
              className="ui-filter-bar__input"
              value={current !== undefined ? stringValues(current.value).join(",") : ""}
              placeholder={label}
              aria-label={label}
              onChange={(event) => {
                const next = event.target.value;
                setFieldLeaves(
                  field.field,
                  next === "" ? [] : [{ field: field.field, op, value: next }],
                );
              }}
            />
          </div>
        );
      })}

      {hasActive ? (
        <ui.Button
          type="button"
          variant="ghost"
          size="sm"
          className={merge("ui-filter-bar__clear", classNames?.clear)}
          data-testid="filter-clear"
          onClick={clearAll}
        >
          <ui.icons.X size={12} aria-hidden="true" />
          {clearLabel}
        </ui.Button>
      ) : null}
    </div>
  );
}
