import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";
import { Kbd } from "../values/kbd";
import type { CommandListHandle } from "./use-command-list";

interface CommandSearchProps {
  list: CommandListHandle;
  placeholder: string;
  ariaLabel?: string;
  inputTestId: string;
}

export function CommandSearch({ list, placeholder, ariaLabel, inputTestId }: CommandSearchProps) {
  const ui = useUiAdapter();
  return (
    <div className="ui-command__search">
      <span className="ui-command__search-icon" aria-hidden="true">
        <ui.icons.Search />
      </span>
      <ui.Input
        {...list.getInputProps()}
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        className="ui-command__input"
        data-testid={inputTestId}
        autoFocus
      />
    </div>
  );
}

interface CommandListProps {
  list: CommandListHandle;
  ariaLabel?: string;
  emptyText?: ReactNode;
}

export function CommandList({ list, ariaLabel, emptyText }: CommandListProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  return (
    <div
      id={list.listId}
      role="listbox"
      aria-label={ariaLabel ?? "Commands"}
      className="ui-command__list"
    >
      {list.filtered.length === 0 ? (
        <div className="ui-command__empty" role="status">
          {emptyText ?? "No results."}
        </div>
      ) : (
        list.groups.map((group) => (
          // biome-ignore lint/a11y/useSemanticElements: command groups are listbox sections, not form fields
          <div key={group.key} role="group" aria-label={group.label} className="ui-command__group">
            {group.label !== undefined ? (
              <div className="ui-command__group-label" aria-hidden="true">
                {group.label}
              </div>
            ) : null}
            {group.entries.map(({ item, index }) => {
              const { ref, ...optionProps } = list.getItemProps(item, index);
              const testId =
                item.testId ??
                (item.id !== undefined ? `command-item-${item.id}` : `command-item-${index}`);
              return (
                <button
                  key={item.id ?? `${group.key}-${index}`}
                  ref={ref}
                  type="button"
                  {...optionProps}
                  className={merge(
                    "ui-command__item",
                    item.disabled === true && "ui-command__item--disabled",
                  )}
                  data-testid={testId}
                >
                  {item.icon !== undefined ? (
                    <span className="ui-command__item-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="ui-command__item-label">{item.label}</span>
                  {item.shortcut !== undefined ? (
                    <span className="ui-command__item-shortcut">{item.shortcut}</span>
                  ) : null}
                  {item.checked === true ? (
                    <span className="ui-command__item-check" aria-hidden="true">
                      <ui.icons.Check />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

interface CommandFooterProps {
  count: number;
  children?: ReactNode;
}

export function CommandFooter({ count, children }: CommandFooterProps) {
  return (
    <div className="ui-command__footer">
      <div className="ui-command__hints">
        {children ?? (
          <>
            <span className="ui-command__hint">
              <Kbd keys={["↑", "↓"]} separator=" " /> Navigate
            </span>
            <span className="ui-command__hint">
              <Kbd shortcut="enter" /> Select
            </span>
            <span className="ui-command__hint">
              <Kbd shortcut="esc" /> Close
            </span>
          </>
        )}
      </div>
      <span className="ui-command__count">{count}</span>
    </div>
  );
}
