import type { Command, Effect, Scope, StandardSchemaV1 } from "@lynxland/uikit-core";
import { type CommandEntity, useCommandForm } from "@lynxland/uikit-react";
import {
  type FieldInput,
  FormView,
  PageLayout,
  type PageLayoutProps,
} from "@lynxland/uikit-surfaces";
import type { ReactNode } from "react";

/**
 * Default form page (design.md §6.4): `PageLayout + FormView + useCommandForm`.
 *
 * The command form owns validation/result/error state; the page only places it.
 * `cancel` is a page-header slot (a `Link` in most apps), so it stays a
 * Router-free ReactNode.
 */
export interface FormPageProps<I extends object, O> {
  title?: ReactNode;
  description?: ReactNode;
  command: Command<I, O>;
  fields: readonly FieldInput<I>[];
  defaultValues?: Partial<I>;
  schema?: StandardSchemaV1<I>;
  onSuccess?: (payload: O) => void;
  cancel?: ReactNode;
  submitLabel?: string;
  scope?: Scope;
  entity?: CommandEntity;
  effects?: readonly Effect[];
  width?: PageLayoutProps["width"];
  breadcrumb?: ReactNode;
  className?: string;
}

export function FormPage<I extends object, O>({
  title,
  description,
  command,
  fields,
  defaultValues,
  schema,
  onSuccess,
  cancel,
  submitLabel,
  scope,
  entity,
  effects,
  width,
  breadcrumb,
  className,
}: FormPageProps<I, O>) {
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
        if (result?.status === "ok") onSuccess?.(result.payload);
      },
    },
  );

  return (
    <PageLayout
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(cancel !== undefined ? { actions: cancel } : {})}
      width={width ?? "narrow"}
      {...(breadcrumb !== undefined ? { breadcrumb } : {})}
      {...(className !== undefined ? { className } : {})}
    >
      <FormView
        form={form}
        fields={fields}
        {...(submitLabel !== undefined ? { submitLabel } : {})}
      />
    </PageLayout>
  );
}
