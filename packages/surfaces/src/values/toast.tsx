import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "./classes";

/**
 * Toast queue and viewport (design.md §6.1 feedback values).
 *
 * The queue is module-level so `toast.success/error/info` works imperatively
 * from event handlers and non-React code. `ToastProvider` is the only piece
 * that renders; it subscribes with `useSyncExternalStore`, so any number of
 * providers (normally one, near the app root) can observe the same queue.
 *
 * No adapter primitive is required: the viewport uses surfaces CSS and the
 * adapter `Button` + `X` icon for the close affordance.
 */

export type ToastTone = "success" | "error" | "info";

export interface ToastAction {
  label: ReactNode;
  onClick: () => void;
}

export interface ToastOptions {
  description?: ReactNode;
  icon?: ReactNode;
  action?: ToastAction;
  /** Milliseconds before auto-dismiss; `0` keeps the toast until dismissed. */
  duration?: number;
  /** Replace a toast with the same id instead of stacking a duplicate. */
  id?: string;
}

export interface ToastRecord {
  id: string;
  tone: ToastTone;
  message: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ToastAction;
  duration: number;
}

export interface ToastApi {
  success(message: ReactNode, options?: ToastOptions): string;
  error(message: ReactNode, options?: ToastOptions): string;
  info(message: ReactNode, options?: ToastOptions): string;
  /** Dismiss one toast, or every toast when `id` is omitted. */
  dismiss(id?: string): void;
  /** Remove every queued toast. */
  clear(): void;
}

const DEFAULT_DURATION = 5000;
const DEFAULT_LIMIT = 5;

let toastLimit = DEFAULT_LIMIT;
let nextId = 0;
let records: readonly ToastRecord[] = [];
const listeners = new Set<() => void>();

function notify(next: readonly ToastRecord[]): void {
  records = next;
  for (const listener of listeners) listener();
}

function trim(next: readonly ToastRecord[]): readonly ToastRecord[] {
  return next.length > toastLimit ? next.slice(next.length - toastLimit) : next;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): readonly ToastRecord[] {
  return records;
}

function push(tone: ToastTone, message: ReactNode, options?: ToastOptions): string {
  nextId += 1;
  const id = options?.id ?? `ui-toast-${nextId}`;
  const record: ToastRecord = {
    id,
    tone,
    message,
    duration: options?.duration ?? DEFAULT_DURATION,
    ...(options?.description !== undefined ? { description: options.description } : {}),
    ...(options?.icon !== undefined ? { icon: options.icon } : {}),
    ...(options?.action !== undefined ? { action: options.action } : {}),
  };
  notify(trim([...records.filter((item) => item.id !== id), record]));
  return id;
}

function dismiss(id?: string): void {
  if (id === undefined) {
    if (records.length > 0) notify([]);
    return;
  }
  const next = records.filter((item) => item.id !== id);
  if (next.length !== records.length) notify(next);
}

/** Imperative toast API. Safe to call before (or without) a provider. */
export const toast: ToastApi = {
  success: (message, options) => push("success", message, options),
  error: (message, options) => push("error", message, options),
  info: (message, options) => push("info", message, options),
  dismiss,
  clear: () => dismiss(),
};

/** Hook form for components that prefer an explicit dependency. */
export function useToast(): ToastApi {
  return toast;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** Maximum number of stacked toasts; older entries are dropped. */
  limit?: number;
  className?: string;
}

/**
 * Subscribes to the module-level toast queue and renders the live viewport.
 * Mount it once at the app root (the console preset does this by default).
 */
export function ToastProvider({ children, limit = DEFAULT_LIMIT, className }: ToastProviderProps) {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const previous = toastLimit;
    toastLimit = Math.max(1, Math.trunc(limit));
    const next = trim(records);
    if (next !== records) notify(next);
    return () => {
      toastLimit = previous;
    };
  }, [limit]);

  return (
    <>
      {children}
      <ToastViewport toasts={toasts} className={className} />
    </>
  );
}

interface ToastViewportProps {
  toasts: readonly ToastRecord[];
  className?: string;
}

function ToastViewport({ toasts, className }: ToastViewportProps) {
  return (
    <section
      className={cx("ui-toast-viewport", className)}
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      aria-label="Notifications"
      data-testid="toast-viewport"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={toast.dismiss} />
      ))}
    </section>
  );
}

interface ToastCardProps {
  item: ToastRecord;
  onDismiss: (id: string) => void;
}

function ToastCard({ item, onDismiss }: ToastCardProps) {
  const ui = useUiAdapter();
  const [paused, setPaused] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (paused || item.duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.duration, item.id, onDismiss, paused]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover/focus pause container; dismiss and action are real buttons
    <div
      ref={cardRef}
      className="ui-toast"
      data-tone={item.tone}
      data-testid="toast-item"
      role={item.tone === "error" ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={(event) => {
        const related = event.relatedTarget;
        if (!(related instanceof Node) || !event.currentTarget.contains(related)) resume();
      }}
    >
      {item.icon !== undefined ? (
        <span className="ui-toast__icon" aria-hidden="true">
          {item.icon}
        </span>
      ) : null}
      <div className="ui-toast__body">
        <div className="ui-toast__message">{item.message}</div>
        {item.description !== undefined ? (
          <div className="ui-toast__description">{item.description}</div>
        ) : null}
        {item.action !== undefined ? (
          <div className="ui-toast__action">
            <ui.Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                item.action?.onClick();
                onDismiss(item.id);
              }}
            >
              {item.action.label}
            </ui.Button>
          </div>
        ) : null}
      </div>
      <ui.Button
        type="button"
        variant="ghost"
        size="icon"
        className="ui-toast__close"
        aria-label="Dismiss notification"
        data-testid="toast-dismiss"
        onClick={() => onDismiss(item.id)}
      >
        <ui.icons.X />
      </ui.Button>
    </div>
  );
}
