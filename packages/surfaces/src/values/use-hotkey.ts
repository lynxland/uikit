import { useEffect, useRef } from "react";

export interface UseHotkeyOptions {
  /** `event.key` value; matching is case-insensitive (`"k"`, `"Escape"`, `"ArrowDown"`). */
  key: string;
  handler: (event: KeyboardEvent) => void;
  /** Platform modifier: ⌘ on Apple platforms, Ctrl elsewhere. */
  mod?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
  /** Disable registration without unmounting the owner. */
  enabled?: boolean;
  /**
   * Skip events whose target is an input/textarea/select/contenteditable.
   * Defaults to `true` so shortcuts never steal typing. Set `false` for
   * application-level shortcuts such as a command palette.
   */
  ignoreEditable?: boolean;
  /** `preventDefault()` when the hotkey matches. Defaults to `true`. */
  preventDefault?: boolean;
  /** Listener target; defaults to `window` (SSR-safe: effects are browser-only). */
  target?: EventTarget | null;
}

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? "");
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']") !==
    null
  );
}

/**
 * Window-level keyboard shortcut hook (surfaces, no Router/DOM navigation).
 * Modifier flags are requirements: `true` means the modifier must be pressed;
 * omitted/false means it is not required.
 */
export function useHotkey({
  key,
  handler,
  mod = false,
  ctrl = false,
  meta = false,
  alt = false,
  shift = false,
  enabled = true,
  ignoreEditable = true,
  preventDefault = true,
  target,
}: UseHotkeyOptions): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const node = target ?? window;
    const wanted = key.toLowerCase();

    const onKeyDown = (event: Event): void => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key.toLowerCase() !== wanted) return;
      if (ignoreEditable && isEditableTarget(event.target)) return;

      if (mod) {
        if (isApplePlatform() ? !event.metaKey : !event.ctrlKey) return;
      }
      if (ctrl && !event.ctrlKey) return;
      if (meta && !event.metaKey) return;
      if (alt && !event.altKey) return;
      if (shift && !event.shiftKey) return;

      if (preventDefault) event.preventDefault();
      handlerRef.current(event);
    };

    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [key, mod, ctrl, meta, alt, shift, enabled, ignoreEditable, preventDefault, target]);
}
