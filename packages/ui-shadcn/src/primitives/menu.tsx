// biome-ignore-all lint/suspicious/noArrayIndexKey: menu declarations are static; item order is the identity.
import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { MenuItem, MenuProps } from "@lynxland/uikit-surfaces/adapter";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { Check, ChevronRight } from "./icons";

const popupClass =
  "z-50 min-w-44 rounded-md border border-[var(--border)] bg-[var(--popover)] p-1 text-[var(--popover-foreground)] shadow-md outline-none data-[starting-style]:opacity-0 data-[ending-style]:opacity-0";

const itemClass =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-[var(--accent)] data-[highlighted]:text-[var(--accent-foreground)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

const checkableClass = cx(itemClass, "pr-8");

const indicatorClass = "absolute right-2 flex size-4 items-center justify-center";

function itemContent(item: MenuItem): ReactNode {
  return (
    <>
      {item.icon !== undefined ? (
        <span className="inline-flex size-4 shrink-0 items-center justify-center">{item.icon}</span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </>
  );
}

function dangerClass(item: MenuItem): string | false {
  return item.danger === true && "text-[var(--destructive)]";
}

function separator(key: string): ReactNode {
  return <BaseMenu.Separator key={key} className="my-1 h-px bg-[var(--border)]" />;
}

interface RadioEntry {
  item: MenuItem;
  index: number;
}

function RadioRun({ entries }: { entries: readonly RadioEntry[] }) {
  const selected = entries.find((entry) => entry.item.checked === true);
  return (
    <BaseMenu.RadioGroup
      value={selected?.index ?? null}
      onValueChange={(value) => {
        if (typeof value !== "number") return;
        entries.find((entry) => entry.index === value)?.item.onCheckedChange?.(true);
      }}
      data-slot="menu-radio-group"
    >
      {entries.map(({ item, index }) => (
        <BaseMenu.RadioItem
          key={index}
          value={index}
          disabled={item.disabled}
          closeOnClick
          onClick={item.onSelect}
          className={cx(checkableClass, dangerClass(item))}
        >
          {itemContent(item)}
          <BaseMenu.RadioItemIndicator className={indicatorClass}>
            <Check size={14} />
          </BaseMenu.RadioItemIndicator>
        </BaseMenu.RadioItem>
      ))}
    </BaseMenu.RadioGroup>
  );
}

function renderMenuItems(items: readonly MenuItem[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let radioRun: RadioEntry[] = [];

  const flushRadioRun = () => {
    if (radioRun.length === 0) return;
    const entries = radioRun;
    radioRun = [];
    nodes.push(<RadioRun key={`radio-${entries[0]?.index ?? nodes.length}`} entries={entries} />);
  };

  items.forEach((item, index) => {
    const kind = item.kind ?? "item";

    // Consecutive radio items share one group; a separator breaks the run.
    if (kind === "radio" && item.separator !== true) {
      radioRun.push({ item, index });
      return;
    }

    flushRadioRun();

    if (item.separator === true || kind === "separator") {
      nodes.push(separator(`separator-${index}`));
    }

    if (kind === "separator") {
      return;
    }

    if (kind === "radio") {
      nodes.push(<RadioRun key={`radio-${index}`} entries={[{ item, index }]} />);
      return;
    }

    if (kind === "label") {
      nodes.push(
        <div
          key={index}
          role="presentation"
          className="px-2 py-1.5 text-xs font-medium text-[var(--muted-foreground)]"
          data-slot="menu-label"
        >
          {item.label}
        </div>,
      );
      return;
    }

    if (kind === "checkbox") {
      nodes.push(
        <BaseMenu.CheckboxItem
          key={index}
          checked={item.checked === true}
          disabled={item.disabled}
          onClick={item.onSelect}
          onCheckedChange={(checked) => item.onCheckedChange?.(checked)}
          className={cx(checkableClass, dangerClass(item))}
        >
          {itemContent(item)}
          <BaseMenu.CheckboxItemIndicator className={indicatorClass}>
            <Check size={14} />
          </BaseMenu.CheckboxItemIndicator>
        </BaseMenu.CheckboxItem>,
      );
      return;
    }

    if (kind === "submenu") {
      nodes.push(
        <BaseMenu.SubmenuRoot key={index}>
          <BaseMenu.SubmenuTrigger
            disabled={item.disabled}
            className={cx(itemClass, dangerClass(item))}
          >
            {itemContent(item)}
            <ChevronRight className="ml-auto size-4 shrink-0" />
          </BaseMenu.SubmenuTrigger>
          <BaseMenu.Portal>
            <BaseMenu.Positioner side="right" align="start" sideOffset={4}>
              <BaseMenu.Popup className={popupClass}>
                {renderMenuItems(item.items ?? [])}
              </BaseMenu.Popup>
            </BaseMenu.Positioner>
          </BaseMenu.Portal>
        </BaseMenu.SubmenuRoot>,
      );
      return;
    }

    nodes.push(
      <BaseMenu.Item
        key={index}
        disabled={item.disabled}
        onClick={item.onSelect}
        className={cx(itemClass, dangerClass(item))}
      >
        {itemContent(item)}
      </BaseMenu.Item>,
    );
  });

  flushRadioRun();
  return nodes;
}

/**
 * Controlled-by-Base-UI action menu. The trigger is rendered as the trigger
 * element via `render`, so a Button/Link does not get nested inside a button.
 *
 * Item kinds map to Base UI's native menu parts, so keyboard navigation,
 * typeahead, ARIA roles (`menuitemcheckbox`/`menuitemradio`) and submenu
 * semantics stay in the adapter. `checked` is controlled: checkbox toggles
 * report through `onCheckedChange` and keep the menu open; radio selection
 * closes after reporting.
 */
export function Menu({
  trigger,
  items,
  align = "start",
  side = "bottom",
  "aria-label": ariaLabel,
}: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner side={side} align={align} sideOffset={4}>
          <BaseMenu.Popup aria-label={ariaLabel} className={popupClass}>
            {renderMenuItems(items)}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
