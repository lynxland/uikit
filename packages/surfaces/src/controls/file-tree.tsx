import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

/** One node in a controlled file tree. Directories may nest. */
export interface FileTreeItem {
  id: string;
  label: ReactNode;
  type: "file" | "directory";
  /** Per-item icon; falls back to `folderIcon`/`fileIcon` or the built-in glyph. */
  icon?: ReactNode;
  children?: readonly FileTreeItem[];
}

export interface FileTreeProps {
  items: readonly FileTreeItem[];
  expanded: ReadonlySet<string>;
  onExpandedChange: (expanded: ReadonlySet<string>) => void;
  selected?: string;
  onSelect: (id: string, item: FileTreeItem) => void;
  folderIcon?: ReactNode;
  fileIcon?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

interface FlatNode {
  item: FileTreeItem;
  level: number;
  parentId?: string;
}

function flatten(
  items: readonly FileTreeItem[],
  expanded: ReadonlySet<string>,
  level = 1,
  parentId?: string,
): FlatNode[] {
  const nodes: FlatNode[] = [];
  for (const item of items) {
    nodes.push({ item, level, parentId });
    if (item.type === "directory" && expanded.has(item.id) && item.children !== undefined) {
      nodes.push(...flatten(item.children, expanded, level + 1, item.id));
    }
  }
  return nodes;
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M1.5 3.75c0-.69.56-1.25 1.25-1.25h3.1c.4 0 .78.19 1.02.51l.68.9h5.7c.69 0 1.25.56 1.25 1.25v6.09c0 .69-.56 1.25-1.25 1.25H2.75c-.69 0-1.25-.56-1.25-1.25V3.75Z"
      />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M3.75 1.5h5.19c.33 0 .65.13.88.37l2.31 2.31c.24.23.37.55.37.88v9.19c0 .69-.56 1.25-1.25 1.25h-7.5c-.69 0-1.25-.56-1.25-1.25v-11.5c0-.69.56-1.25 1.25-1.25Zm5.25 1.5v2.25c0 .41.34.75.75.75h2.25L9 3Z"
      />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m6 4 4 4-4 4"
      />
    </svg>
  );
}

/**
 * Controlled file tree with roving focus and the WAI-ARIA tree keyboard model
 * (ArrowUp/Down, Home/End, ArrowRight expand / first child, ArrowLeft collapse
 * / parent, Enter/Space select). Expansion and selection are caller-owned; the
 * component never reads data or Router state.
 */
export function FileTree({
  items,
  expanded,
  onExpandedChange,
  selected,
  onSelect,
  folderIcon,
  fileIcon,
  className,
  "aria-label": ariaLabel = "Files",
}: FileTreeProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [focusedId, setFocusedId] = useState<string | undefined>(selected);
  const nodes = flatten(items, expanded);
  const ids = nodes.map((node) => node.item.id);
  const effectiveFocus =
    focusedId !== undefined && ids.includes(focusedId)
      ? focusedId
      : selected !== undefined && ids.includes(selected)
        ? selected
        : ids[0];

  const itemElements = (): HTMLElement[] =>
    Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-file-tree-item]") ?? []);

  const focusId = (id: string | undefined): void => {
    if (id === undefined) return;
    const element = itemElements().find((candidate) => candidate.dataset.fileTreeItem === id);
    if (element === undefined) return;
    setFocusedId(id);
    element.focus();
  };

  const toggle = (item: FileTreeItem): void => {
    const next = new Set(expanded);
    if (next.has(item.id)) next.delete(item.id);
    else next.add(item.id);
    onExpandedChange(next);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, node: FlatNode): void => {
    const index = ids.indexOf(node.item.id);
    const isDirectory = node.item.type === "directory";
    const isExpanded = expanded.has(node.item.id);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusId(ids[index + 1]);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusId(ids[index - 1]);
        break;
      case "Home":
        event.preventDefault();
        focusId(ids[0]);
        break;
      case "End":
        event.preventDefault();
        focusId(ids[ids.length - 1]);
        break;
      case "ArrowRight":
        if (!isDirectory) return;
        event.preventDefault();
        if (!isExpanded) {
          toggle(node.item);
        } else {
          const nextNode = nodes[index + 1];
          if (nextNode?.parentId === node.item.id) focusId(nextNode.item.id);
        }
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (isDirectory && isExpanded) toggle(node.item);
        else focusId(node.parentId);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onSelect(node.item.id, node.item);
        break;
      default:
        break;
    }
  };

  const renderNodes = (
    nodesToRender: readonly FileTreeItem[],
    level: number,
    parentId?: string,
  ) => {
    return nodesToRender.map((item) => {
      const isDirectory = item.type === "directory";
      const isExpanded = isDirectory && expanded.has(item.id);
      const hasChildren = isDirectory && item.children !== undefined && item.children.length > 0;
      const icon =
        item.icon ?? (isDirectory ? (folderIcon ?? <FolderGlyph />) : (fileIcon ?? <FileGlyph />));

      return (
        <li key={item.id} role="none" className="ui-file-tree__item">
          <div
            role="treeitem"
            aria-level={level}
            aria-selected={item.id === selected}
            {...(isDirectory ? { "aria-expanded": isExpanded } : {})}
            tabIndex={item.id === effectiveFocus ? 0 : -1}
            className={merge(
              "ui-file-tree__row",
              item.id === selected && "ui-file-tree__row--selected",
            )}
            data-file-tree-item={item.id}
            data-type={item.type}
            data-expanded={isDirectory ? String(isExpanded) : undefined}
            onClick={() => {
              onSelect(item.id, item);
              if (hasChildren) toggle(item);
            }}
            onFocus={() => setFocusedId(item.id)}
            onKeyDown={(event) => handleKeyDown(event, { item, level, parentId })}
          >
            {isDirectory ? (
              <span
                className="ui-file-tree__chevron"
                data-expanded={isExpanded ? "true" : undefined}
                aria-hidden="true"
              >
                <ChevronGlyph />
              </span>
            ) : (
              <span className="ui-file-tree__chevron" aria-hidden="true" />
            )}
            <span className="ui-file-tree__icon" aria-hidden="true">
              {icon}
            </span>
            <span className="ui-file-tree__label">{item.label}</span>
          </div>
          {hasChildren && isExpanded ? (
            // biome-ignore lint/a11y/useSemanticElements: ARIA tree groups are lists; no native element maps to role="group"
            <ul role="group" className="ui-file-tree__group">
              {renderNodes(item.children ?? [], level + 1, item.id)}
            </ul>
          ) : null}
        </li>
      );
    });
  };

  return (
    <div
      ref={rootRef}
      role="tree"
      aria-label={ariaLabel}
      className={merge("ui-file-tree", className)}
    >
      <ul role="none" className="ui-file-tree__list">
        {renderNodes(items, 1)}
      </ul>
    </div>
  );
}
