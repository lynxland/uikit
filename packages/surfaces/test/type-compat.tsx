import type { FieldInputRenderArgs, FieldInputSlotArgs } from "../src/fields";

interface Values {
  name: string;
  count: number;
}

export function customSlot({ form, name }: FieldInputSlotArgs<Values>) {
  return (
    <form.Field name={name}>
      {(field) => (
        <input
          value={String(field.state.value)}
          onChange={(event) => field.handleChange(event.target.value)}
        />
      )}
    </form.Field>
  );
}

export function renderSlot({ form, name, setValue }: FieldInputRenderArgs<Values>) {
  return (
    <form.Field name={name}>
      {(field) => (
        <button type="button" onClick={() => setValue(field.state.value)}>
          {String(field.state.value)}
        </button>
      )}
    </form.Field>
  );
}
