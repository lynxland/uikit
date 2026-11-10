import type { Scope } from "@lynxland/uikit-core";
import { createContext, type ReactNode, useContext } from "react";

/**
 * One Scope concept, three rules (design.md §5.5):
 *
 * 1. declaration: sources/entities may declare `scope: readonly string[]`;
 * 2. value: the app root mounts `ScopeProvider`; bindings may pass `options.scope`;
 * 3. same source: one resolved scope feeds read keys, command ctx, and invalidation.
 *
 * There is no `__scopeKeys` / `scopeOf` adoption chain in v3.
 */

const ScopeContext = createContext<Scope>({});

export interface ScopeProviderProps {
  value: Scope;
  children?: ReactNode;
}

export function ScopeProvider({ value, children }: ScopeProviderProps) {
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

/** The ambient scope. Defaults to `{}` when no provider is mounted. */
export function useScope(): Scope {
  return useContext(ScopeContext);
}

/**
 * A declared scope is ready when every declared key has a value.
 * An undeclared scope (`undefined`) is always ready.
 */
export function scopeReady(
  declared: readonly string[] | undefined,
  scope: Scope | undefined,
): boolean {
  if (declared === undefined || declared.length === 0) return true;
  for (const key of declared) {
    if (scope?.[key] === undefined) return false;
  }
  return true;
}

/** List the declared keys that are missing from a scope (development diagnostics). */
export function missingScopeKeys(
  declared: readonly string[] | undefined,
  scope: Scope | undefined,
): readonly string[] {
  if (declared === undefined || declared.length === 0) return [];
  return [...new Set(declared)].filter((key) => scope?.[key] === undefined);
}

/**
 * Binding-side scope resolution.
 *
 * - explicit `options.scope` always wins;
 * - the provider value is adopted only when the capability declares scope keys
 *   (`declared` non-empty), matching the fail-safe rule for reads;
 * - commands opt into the provider explicitly (they have no declaration of their own).
 */
export function resolveScope(
  explicit: Scope | undefined,
  provider: Scope,
  declared: readonly string[] | undefined,
): Scope {
  if (explicit !== undefined) return explicit;
  return declared !== undefined && declared.length > 0 ? provider : {};
}
