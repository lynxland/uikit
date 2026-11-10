import type { Command, Effect, Scope, StandardSchemaV1 } from "@lynxland/uikit-core";
import { type CommandEntity, useCommand, useCommandForm } from "@lynxland/uikit-react";
import { type FieldInput, FormView, useUiAdapter } from "@lynxland/uikit-surfaces";
import type { ReactNode } from "react";

export interface CommandFormHostOptions<I extends object> {
  title?: ReactNode;
  description?: ReactNode;
  fields: readonly FieldInput<I>[];
  defaultValues?: Partial<I>;
  schema?: StandardSchemaV1<I>;
  submitLabel?: string;
  scope?: Scope;
  entity?: CommandEntity;
  effects?: readonly Effect[];
}

export interface CommandDialogProps<I extends object, O> extends CommandFormHostOptions<I> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  command: Command<I, O>;
  onSuccess?: (payload: O) => void;
}

/**
 * Dialog host for a command form. Closes on `ok`; rejected/conflict stays open
 * with FormView's normal error handling.
 */
export function CommandDialog<I extends object, O>({
  open,
  onOpenChange,
  command,
  title,
  description,
  fields,
  defaultValues,
  schema,
  submitLabel,
  scope,
  entity,
  effects,
  onSuccess,
}: CommandDialogProps<I, O>) {
  const ui = useUiAdapter();
  const form = useCommandForm(
    command,
    {
      fields,
      ...(defaultValues !== undefined ? { defaultValues } : {}),
      ...(schema !== undefined ? { schema } : {}),
    },
    {
      ...(scope !== undefined ? { scope } : {}),
      ...(entity !== undefined ? { entity } : {}),
      ...(effects !== undefined ? { effects } : {}),
      onSettled: (result) => {
        if (result?.status !== "ok") return;
        onSuccess?.(result.payload);
        onOpenChange(false);
      },
    },
  );

  return (
    <ui.Dialog
      open={open}
      onOpenChange={onOpenChange}
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
    >
      <FormView
        form={form}
        fields={fields}
        {...(submitLabel !== undefined ? { submitLabel } : {})}
        cancel={() => onOpenChange(false)}
      />
    </ui.Dialog>
  );
}

export interface CommandDrawerProps<I extends object, O> extends CommandFormHostOptions<I> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  command: Command<I, O>;
  onSuccess?: (payload: O) => void;
  side?: "left" | "right";
}

/** Drawer host for a command form; same close-on-ok contract as CommandDialog. */
export function CommandDrawer<I extends object, O>({
  open,
  onOpenChange,
  command,
  title,
  description,
  fields,
  defaultValues,
  schema,
  submitLabel,
  scope,
  entity,
  effects,
  onSuccess,
  side = "right",
}: CommandDrawerProps<I, O>) {
  const ui = useUiAdapter();
  const form = useCommandForm(
    command,
    {
      fields,
      ...(defaultValues !== undefined ? { defaultValues } : {}),
      ...(schema !== undefined ? { schema } : {}),
    },
    {
      ...(scope !== undefined ? { scope } : {}),
      ...(entity !== undefined ? { entity } : {}),
      ...(effects !== undefined ? { effects } : {}),
      onSettled: (result) => {
        if (result?.status !== "ok") return;
        onSuccess?.(result.payload);
        onOpenChange(false);
      },
    },
  );

  return (
    <ui.Drawer
      open={open}
      onOpenChange={onOpenChange}
      side={side}
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
    >
      <FormView
        form={form}
        fields={fields}
        {...(submitLabel !== undefined ? { submitLabel } : {})}
        cancel={() => onOpenChange(false)}
      />
    </ui.Drawer>
  );
}

export interface ConfirmCommandDialogProps<I, O> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  command: Command<I, O>;
  input: I;
  title?: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  scope?: Scope;
  entity?: CommandEntity;
  effects?: readonly Effect[];
  onSuccess?: (payload: O) => void;
}

/**
 * Reusable destructive/confirm host for a bare command (delete, transfer,
 * revoke). Closes on ok; failure/rejection stays visible.
 */
export function ConfirmCommandDialog<I, O>({
  open,
  onOpenChange,
  command,
  input,
  title = "Confirm action",
  description,
  confirmLabel = "Confirm",
  scope,
  entity,
  effects,
  onSuccess,
}: ConfirmCommandDialogProps<I, O>) {
  const ui = useUiAdapter();
  const handle = useCommand(command, {
    ...(scope !== undefined ? { scope } : {}),
    ...(entity !== undefined ? { entity } : {}),
    ...(effects !== undefined ? { effects } : {}),
    onSettled: (result) => {
      if (result?.status !== "ok") return;
      onSuccess?.(result.payload);
      onOpenChange(false);
    },
  });
  const message =
    handle.failure?.message ??
    (handle.result !== null && handle.result.status !== "ok" ? handle.result.message : null);

  return (
    <ui.Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      {...(description !== undefined ? { description } : {})}
      footer={
        <>
          <ui.Button
            type="button"
            variant="ghost"
            disabled={handle.pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </ui.Button>
          <ui.Button
            type="button"
            variant="destructive"
            loading={handle.pending}
            disabled={handle.pending || !handle.ready}
            onClick={() => handle.mutate(input)}
          >
            {confirmLabel}
          </ui.Button>
        </>
      }
    >
      {message !== null ? (
        <p role="alert" data-testid="confirm-command-error">
          {message}
        </p>
      ) : null}
    </ui.Dialog>
  );
}
