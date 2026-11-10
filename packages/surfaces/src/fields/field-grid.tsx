import type { ReactNode } from "react";
import { cx } from "../values/classes";
import { FieldValue } from "../values/field-value";
import { ReferenceValue } from "./reference-value";
import { type FieldView, humanizeFieldName } from "./types";

export interface FieldGridClassNames {
  root?: string;
  section?: string;
  sectionTitle?: string;
  item?: string;
  label?: string;
  value?: string;
}

export interface FieldGridProps<T> {
  fields: readonly FieldView<T>[];
  row: T;
  columns?: 1 | 2 | 3;
  empty?: ReactNode;
  className?: string;
  classNames?: FieldGridClassNames;
}

interface FieldGroup<T> {
  section?: string;
  fields: FieldView<T>[];
}

function groupBySection<T>(fields: readonly FieldView<T>[]): FieldGroup<T>[] {
  const groups: FieldGroup<T>[] = [];
  for (const field of fields) {
    const section = field.detail?.section;
    const last = groups[groups.length - 1];
    if (last !== undefined && last.section === section) {
      last.fields.push(field);
    } else {
      groups.push({ ...(section !== undefined ? { section } : {}), fields: [field] });
    }
  }
  return groups;
}

function referenceIds(row: unknown, name: string): string[] {
  const raw = (row as Record<string, unknown>)[name];
  if (Array.isArray(raw)) return raw.map((value) => String(value));
  if (raw === undefined || raw === null || raw === "") return [];
  return [String(raw)];
}

/**
 * Read-only detail grid. Groups consecutive fields by `detail.section` and
 * renders explicit `detail.render` slots first, reference lookup values
 * second, and the shared by-kind `FieldValue` last.
 */
export function FieldGrid<T>({
  fields,
  row,
  columns = 2,
  empty,
  className,
  classNames,
}: FieldGridProps<T>) {
  if (fields.length === 0) {
    return <>{empty ?? null}</>;
  }

  const groups = groupBySection(fields);

  return (
    <div
      className={cx("ui-field-grid", `ui-field-grid--cols-${columns}`, className, classNames?.root)}
      data-testid="field-grid"
    >
      {groups.map((group, groupIndex) => (
        <section
          key={group.section ?? groupIndex}
          className={cx("ui-field-grid__section", classNames?.section)}
        >
          {group.section !== undefined ? (
            <h3 className={cx("ui-field-grid__section-title", classNames?.sectionTitle)}>
              {group.section}
            </h3>
          ) : null}
          <dl className="ui-field-grid__list">
            {group.fields.map((field) => {
              const label = field.label ?? humanizeFieldName(field.name);
              const emptyValue = <FieldValue field={field} row={row} />;
              let value: ReactNode = emptyValue;
              if (field.detail?.render !== undefined) {
                value = field.detail.render(row);
              } else if (field.kind === "reference" && field.reference !== undefined) {
                const ids = referenceIds(row, field.name);
                value =
                  ids.length === 0 ? (
                    emptyValue
                  ) : (
                    <ReferenceValue
                      reference={field.reference}
                      ids={ids}
                      fallback={(id) => <code className="ui-field-value__id">{id}</code>}
                    />
                  );
              }
              return (
                <div
                  key={field.name}
                  className={cx("ui-field-grid__item", classNames?.item)}
                  data-field={field.name}
                >
                  <dt className={cx("ui-field-grid__label", classNames?.label)}>{label}</dt>
                  <dd
                    className={cx(
                      "ui-field-grid__value",
                      field.detail?.monospace === true && "ui-field-grid__value--monospace",
                      classNames?.value,
                    )}
                  >
                    {value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}
