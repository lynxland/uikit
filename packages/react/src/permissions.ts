/**
 * Permission gating utility (fail-closed).
 *
 * `pending` (identity not loaded) and `denied` are distinct render states;
 * `beforeLoad` can call the pure `permissionState` with a loader-fetched record.
 */

export type PermissionState = "pending" | "granted" | "denied";

/** The minimal identity shape: any data handle satisfies it. */
export interface IdentityLike<T> {
  readonly data: T | undefined;
  readonly status: "idle" | "empty" | "loading" | "error" | "success";
}

export function permissionState<T>(
  identity: IdentityLike<T>,
  predicate: (identity: T) => boolean,
): PermissionState {
  if (identity.status === "idle" || identity.status === "loading") return "pending";
  if (identity.status !== "success" || identity.data === undefined) return "denied";
  return predicate(identity.data) ? "granted" : "denied";
}

export interface CanHandle {
  readonly state: PermissionState;
  /** Fail-closed: only `granted` is true; pending is never "temporarily allowed". */
  readonly allowed: boolean;
}

export function useCan<T>(
  identity: IdentityLike<T>,
  predicate: (identity: T) => boolean,
): CanHandle {
  const state = permissionState(identity, predicate);
  return { state, allowed: state === "granted" };
}
