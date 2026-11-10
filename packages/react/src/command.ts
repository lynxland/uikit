import type {
  ApiError,
  Command,
  Effect,
  Entity,
  Outcome,
  QuerySelector,
  Scope,
  ScopeAxes,
  StandardSchemaV1,
} from "@lynxland/uikit-core";
import { invalidationPredicate, isApiError } from "@lynxland/uikit-core";
import { type ReactFormExtendedApi, useForm, useStore } from "@tanstack/react-form";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { missingScopeKeys, scopeReady, useScope } from "./scope";

/**
 * Command bindings (design.md §5.3).
 *
 * Commands only declare effects; the binding resolves scope, runs the command,
 * applies `treatAs`, and applies `Effect[]` on `ok`. There is no
 * `__scopeKeys` / descriptor scope mechanism in v3.
 */

/** The only entity surface a command binding needs: invalidation target + declarations. */
export type CommandEntity = Pick<Entity<unknown, unknown>, "name" | "scope">;

export interface CommandOptions<I, O> {
  /**
   * Effective scope. A function resolves per input (design allows it);
   * otherwise `options.scope ?? ScopeProvider ?? {}`.
   */
  scope?: Scope | ((input: I) => Scope);
  /** Binding target: supplies the default invalidation effect and declared scope keys. */
  entity?: CommandEntity;
  /** Declared scope keys for bare commands (no entity). */
  scopeKeys?: readonly string[];
  /** Explicit effects override `command.effects`; `[]` disables invalidation. */
  effects?: readonly Effect[];
  /** Record id for the default entity record invalidation (value or input projection). */
  id?: unknown | ((input: I) => unknown);
  onSettled?: (result: Outcome<O> | null, failure: ApiError | null) => void;
}

export interface CommandHandle<I, O> {
  mutate(input: I): void;
  mutateAsync(input: I): Promise<Outcome<O>>;
  readonly result: Outcome<O> | null;
  readonly failure: ApiError | null;
  readonly pending: boolean;
  /** False when declared scope keys are absent; `mutate` throws instead of silently no-oping. */
  readonly ready: boolean;
  reset(): void;
}

function axesOf(entity: CommandEntity | undefined): ScopeAxes | undefined {
  if (entity?.scope === undefined) return undefined;
  return { [entity.name]: entity.scope };
}

function effectSelectors(effects: readonly Effect[]): QuerySelector[] {
  const selectors: QuerySelector[] = [];
  for (const effect of effects) {
    if (effect.type !== "invalidate") continue;
    selectors.push({
      source: effect.entity,
      ...(effect.kind !== undefined ? { kind: effect.kind } : {}),
      ...(effect.id !== undefined ? { id: effect.id } : {}),
      ...(effect.allScopes === true ? { allScopes: true } : {}),
    });
  }
  return selectors;
}

/**
 * Apply core `Effect[]` through TanStack Query. Single implementation shared by
 * command results, frame invalidation, and imperative orchestration.
 */
export function applyEffects(
  queryClient: Pick<QueryClient, "invalidateQueries">,
  effects: readonly Effect[],
  scope: Scope,
  axes?: ScopeAxes,
): void {
  const selectors = effectSelectors(effects);
  if (selectors.length > 0) {
    void queryClient.invalidateQueries({
      predicate: invalidationPredicate(selectors, scope, axes),
    });
  }
  for (const effect of effects) {
    if (effect.type === "invalidateKey") {
      void queryClient.invalidateQueries({ queryKey: effect.key });
    }
  }
}

export interface InvalidateAfterCommandOptions<I> {
  effects?: readonly Effect[];
  entity?: CommandEntity;
  id?: unknown | ((input: I) => unknown);
  input?: I;
}

function resolveRecordId<I>(
  id: unknown | ((input: I) => unknown) | undefined,
  input: I | undefined,
): unknown {
  if (typeof id !== "function") return id;
  if (input === undefined) return undefined;
  return (id as (value: I) => unknown)(input);
}

/**
 * Single source for command invalidation.
 *
 * Precedence: `options.effects` > `command.effects` > entity default.
 * The entity default invalidates its collection and, when an id is supplied,
 * its record. `effects: []` explicitly means "invalidate nothing".
 */
export function invalidateAfterCommand<I>(
  queryClient: Pick<QueryClient, "invalidateQueries">,
  command: Command<I, unknown>,
  scope: Scope,
  options: InvalidateAfterCommandOptions<I> = {},
): void {
  const axes = axesOf(options.entity);
  const declared = options.effects ?? command.effects;

  if (declared !== undefined) {
    applyEffects(queryClient, declared, scope, axes);
    return;
  }

  if (options.entity === undefined) return;

  const id = resolveRecordId(options.id, options.input);
  const effects: Effect[] = [
    { type: "invalidate", entity: options.entity.name, kind: "collection" },
    ...(id !== undefined
      ? [{ type: "invalidate" as const, entity: options.entity.name, kind: "record" as const, id }]
      : []),
  ];
  applyEffects(queryClient, effects, scope, axes);
}

function remapFailure<O>(
  error: unknown,
  treatAs: Command<unknown, O>["treatAs"],
): Outcome<O> | undefined {
  if (!isApiError(error)) return undefined;
  if (error.kind === "not-found" || error.kind === "forbidden") {
    return treatAs?.[error.kind];
  }
  return undefined;
}

function remapRejection<O>(
  outcome: Outcome<O>,
  treatAs: Command<unknown, O>["treatAs"],
): Outcome<O> {
  if (outcome.status !== "rejected") return outcome;
  if (outcome.code === "not-found" || outcome.code === "forbidden") {
    return treatAs?.[outcome.code] ?? outcome;
  }
  return outcome;
}

function notReadyError(missing: readonly string[]): Error {
  return new Error(
    `@lynxland/uikit-react: command is not ready — missing scope keys: ${missing.join(", ")}. ` +
      "Provide them via options.scope, ScopeProvider, or per-input scope.",
  );
}

export function useCommand<I, O>(
  command: Command<I, O>,
  options: CommandOptions<I, O> = {},
): CommandHandle<I, O> {
  const provider = useScope();
  const queryClient = useQueryClient();
  const declared = options.scopeKeys ?? options.entity?.scope;
  const scopeOption = options.scope;

  const staticScope: Scope =
    typeof scopeOption === "function" ? provider : (scopeOption ?? provider);
  const ready = typeof scopeOption === "function" ? true : scopeReady(declared, staticScope);

  // Keep the latest options out of mutation/effects closures so `mutate` stays stable.
  const latest = useRef({ provider, declared, scopeOption, options, command });
  latest.current = { provider, declared, scopeOption, options, command };

  const assertReady = useCallback((input: I): Scope => {
    const current = latest.current;
    const scope =
      typeof current.scopeOption === "function"
        ? current.scopeOption(input)
        : (current.scopeOption ?? current.provider);
    if (!scopeReady(current.declared, scope)) {
      throw notReadyError(missingScopeKeys(current.declared, scope));
    }
    return scope;
  }, []);

  const mutation = useMutation<Outcome<O>, ApiError, I>({
    mutationFn: async (input) => {
      const current = latest.current;
      const scope = assertReady(input);

      let result: Outcome<O>;
      try {
        result = await current.command.run(input, scope);
      } catch (error) {
        const remapped = remapFailure(error, current.command.treatAs);
        if (remapped === undefined) throw error;
        result = remapped;
      }

      result = remapRejection(result, current.command.treatAs);

      if (result.status === "ok") {
        invalidateAfterCommand(queryClient, current.command, scope, {
          ...(current.options.effects !== undefined ? { effects: current.options.effects } : {}),
          ...(current.options.entity !== undefined ? { entity: current.options.entity } : {}),
          ...(current.options.id !== undefined ? { id: current.options.id } : {}),
          input,
        });
      }
      return result;
    },
    onSuccess: (result) => latest.current.options.onSettled?.(result, null),
    onError: (error) => latest.current.options.onSettled?.(null, error),
  });

  const mutate = useCallback(
    (input: I) => {
      assertReady(input);
      mutation.mutate(input);
    },
    [assertReady, mutation.mutate],
  );

  const mutateAsync = useCallback(
    (input: I): Promise<Outcome<O>> => {
      try {
        assertReady(input);
      } catch (error) {
        return Promise.reject(error);
      }
      return mutation.mutateAsync(input);
    },
    [assertReady, mutation.mutateAsync],
  );

  return {
    mutate,
    mutateAsync,
    result: mutation.data ?? null,
    failure: mutation.error ?? null,
    pending: mutation.isPending,
    ready,
    reset: mutation.reset,
  };
}

// ============ useCommandForm ============

/**
 * Minimal structural projection of `@lynxland/uikit-surfaces` `FieldInput<I>`.
 * React (L4) cannot import surfaces (L5); the full render slot is passed through
 * untouched. `FieldInput<I>` is assignable to this shape.
 */
export interface CommandFormField<I extends object> {
  readonly name: keyof I & string;
}

export interface FormSpec<I extends object, F extends CommandFormField<I> = CommandFormField<I>> {
  schema?: StandardSchemaV1<I>;
  fields: readonly F[];
  defaultValues?: Partial<I>;
}

/** `useForm` with all validator generics pinned; the form API is the engine's own. */
export type CommandFormApi<I extends object> = ReactFormExtendedApi<
  I,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  never
>;

export interface CommandFormHandle<
  I extends object,
  O,
  F extends CommandFormField<I> = CommandFormField<I>,
> {
  readonly form: CommandFormApi<I>;
  readonly fields: readonly F[];
  readonly submitting: boolean;
  /** Form-level message for rejected/conflict/validation/failure (UI-ready). */
  readonly error: string | null;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly result: Outcome<O> | null;
  readonly failure: ApiError | null;
  /** One-shot ok payload (tokens/invite links); never enters the query cache. */
  readonly reveal: O | undefined;
  /** Run the command for a value; maps rejected/conflict/validation into form state. */
  run(input: I): Promise<Outcome<O>>;
  /** Engine submit: validates via TanStack Form, then calls `run(form.values)`. */
  submit(): Promise<void>;
  reset(): void;
}

interface StandardIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
}

interface StandardResult {
  readonly value?: unknown;
  readonly issues?: readonly StandardIssue[];
}

type ValidationOutcome<I> =
  | { readonly ok: true; readonly value: I }
  | { readonly ok: false; readonly message: string; readonly fieldErrors: Record<string, string> };

const EMPTY_FIELD_ERRORS: Readonly<Record<string, string>> = Object.freeze({});

async function validateStandard<I>(
  schema: StandardSchemaV1<I>,
  value: I,
): Promise<ValidationOutcome<I>> {
  const raw = (await schema["~standard"].validate(value)) as unknown as StandardResult;
  if (raw.issues === undefined || raw.issues.length === 0) {
    return { ok: true, value: (raw.value ?? value) as I };
  }
  const fieldErrors: Record<string, string> = {};
  for (const issue of raw.issues) {
    const first = issue.path?.[0];
    const field = first === undefined ? undefined : typeof first === "object" ? first.key : first;
    if (typeof field === "string") {
      const previous = fieldErrors[field];
      fieldErrors[field] = previous === undefined ? issue.message : `${previous}; ${issue.message}`;
    }
  }
  return {
    ok: false,
    message: raw.issues.map((issue) => issue.message).join("; "),
    fieldErrors,
  };
}

export function useCommandForm<
  I extends object,
  O,
  F extends CommandFormField<I> = CommandFormField<I>,
>(
  command: Command<I, O>,
  spec: FormSpec<I, F>,
  options: CommandOptions<I, O> = {},
): CommandFormHandle<I, O, F> {
  const handle = useCommand(command, options);
  const [validation, setValidation] = useState<{
    readonly message: string;
    readonly fieldErrors: Record<string, string>;
  } | null>(null);

  const run = useCallback(
    async (input: I): Promise<Outcome<O>> => {
      // One-shot result semantics: a new attempt clears the previous
      // result/reveal before validation or execution.
      handle.reset();
      if (spec.schema !== undefined) {
        const parsed = await validateStandard<I>(spec.schema, input);
        if (!parsed.ok) {
          setValidation({ message: parsed.message, fieldErrors: parsed.fieldErrors });
          return {
            status: "rejected",
            message: parsed.message,
            ...(Object.keys(parsed.fieldErrors).length > 0
              ? { fieldErrors: parsed.fieldErrors }
              : {}),
          };
        }
      }
      setValidation(null);
      return handle.mutateAsync(input);
    },
    [spec.schema, handle.reset, handle.mutateAsync],
  );

  const runRef = useRef(run);
  runRef.current = run;

  const form = useForm<
    I,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    never
  >({
    defaultValues: (spec.defaultValues ?? {}) as I,
    onSubmit: async ({ value }) => {
      await runRef.current(value);
    },
  });

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  const submit = useCallback(async () => {
    await form.handleSubmit();
  }, [form]);

  const reset = useCallback(() => {
    setValidation(null);
    handle.reset();
    form.reset();
  }, [handle.reset, form]);

  const result = handle.result;
  const rejectedMessage =
    result?.status === "rejected" || result?.status === "conflict" ? result.message : undefined;
  const formError = validation?.message ?? rejectedMessage ?? handle.failure?.message ?? null;
  const fieldErrors = useMemo<Readonly<Record<string, string>>>(
    () =>
      validation?.fieldErrors ??
      (result?.status === "rejected"
        ? (result.fieldErrors ?? EMPTY_FIELD_ERRORS)
        : EMPTY_FIELD_ERRORS),
    [validation, result],
  );

  // Mirror binding-level errors into the form engine's error map so consumers
  // can render `<form.Subscribe>` / field meta without a second error channel.
  const setErrorMap = form.setErrorMap;
  useEffect(() => {
    (setErrorMap as unknown as (map: unknown) => void)({
      onSubmit: formError === null ? undefined : { form: formError, fields: fieldErrors },
    });
  }, [setErrorMap, formError, fieldErrors]);

  return {
    form,
    fields: spec.fields,
    submitting: handle.pending || isSubmitting,
    error: formError,
    fieldErrors,
    result,
    failure: handle.failure,
    reveal: result?.status === "ok" ? result.payload : undefined,
    run,
    submit,
    reset,
  };
}
