import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./classes";

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? "");
}

const MAC_SYMBOLS: Readonly<Record<string, string>> = {
  mod: "⌘",
  meta: "⌘",
  cmd: "⌘",
  ctrl: "⌃",
  control: "⌃",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
  enter: "↵",
  return: "↵",
  escape: "Esc",
  esc: "Esc",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
};

const OTHER_LABELS: Readonly<Record<string, string>> = {
  mod: "Ctrl",
  meta: "Meta",
  cmd: "Meta",
  ctrl: "Ctrl",
  control: "Ctrl",
  alt: "Alt",
  option: "Alt",
  shift: "Shift",
  enter: "Enter",
  return: "Enter",
  escape: "Esc",
  esc: "Esc",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
};

/** Expand a `mod+k`-style shortcut into display tokens for the current platform. */
export function shortcutKeys(shortcut: string, mac = isMacPlatform()): string[] {
  return shortcut
    .split("+")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => {
      const table = mac ? MAC_SYMBOLS : OTHER_LABELS;
      const resolved = table[part.toLowerCase()] ?? part;
      return /^[a-z]$/i.test(resolved) ? resolved.toUpperCase() : resolved;
    });
}

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /** Explicit key tokens, e.g. `["Ctrl", "K"]`. */
  keys?: string | readonly string[];
  /** Shortcut notation, e.g. `"mod+k"`; the platform picks ⌘ or Ctrl. */
  shortcut?: string;
  /** Token separator; defaults to `""` for `keys` and the platform choice for `shortcut`. */
  separator?: string;
  children?: ReactNode;
}

/**
 * Keyboard hint token (design.md §6.1). Display only; `useHotkey` owns the
 * behaviour and the caller keeps the button's `aria-label` authoritative.
 */
export function Kbd({ keys, shortcut, separator, children, className, ...rest }: KbdProps) {
  const mac = isMacPlatform();
  const values =
    keys !== undefined
      ? typeof keys === "string"
        ? [keys]
        : [...keys]
      : shortcut !== undefined
        ? shortcutKeys(shortcut, mac)
        : [];
  const gap = separator ?? (shortcut !== undefined && !mac ? " " : "");

  if (values.length === 0) {
    return (
      <kbd className={cx("ui-kbd", className)} {...rest}>
        {children}
      </kbd>
    );
  }

  return (
    <kbd className={cx("ui-kbd", className)} {...rest}>
      {values.map((value, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: duplicate key tokens are positionally distinct
        <span className="ui-kbd__key" key={`${value}-${index}`}>
          {index > 0 && gap !== "" ? (
            <span className="ui-kbd__separator" aria-hidden="true">
              {gap}
            </span>
          ) : null}
          {value}
        </span>
      ))}
    </kbd>
  );
}
