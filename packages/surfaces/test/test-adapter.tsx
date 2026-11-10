import {
  cloneElement,
  Fragment,
  type HTMLAttributes,
  isValidElement,
  type MouseEvent,
  type ReactElement,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  BadgeProps,
  ButtonProps,
  CardProps,
  CheckboxProps,
  DateTimeInputProps,
  DialogProps,
  DrawerProps,
  FieldProps,
  IconProps,
  InputProps,
  MenuProps,
  PopoverProps,
  SelectProps,
  SwitchProps,
  TabsProps,
  TextareaProps,
  TooltipProps,
  UiAdapter,
} from "../src/adapter";

function join(...values: Array<string | false | null | undefined>): string {
  return values
    .filter((value): value is string => typeof value === "string" && value !== "")
    .join(" ");
}

function Button({
  variant = "default",
  size = "md",
  loading,
  children,
  disabled,
  className,
  asChild,
  ...rest
}: ButtonProps) {
  if (asChild) {
    if (!isValidElement(children)) {
      throw new Error("testAdapter Button: asChild expects one element");
    }
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: join("test-button", child.props.className),
      "data-variant": variant,
      "data-size": size,
    } as Partial<{ className?: string }>);
  }
  return (
    <button
      {...rest}
      className={join("test-button", className)}
      data-variant={variant}
      data-size={size}
      disabled={disabled === true || loading === true}
      data-loading={loading === true ? "true" : undefined}
    >
      {children}
    </button>
  );
}

function Input({ className, ...rest }: InputProps) {
  return <input {...rest} className={join("test-input", className)} />;
}

function Textarea({ className, ...rest }: TextareaProps) {
  return <textarea {...rest} className={join("test-textarea", className)} />;
}

function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  disabled,
  id,
  "aria-label": ariaLabel,
}: SelectProps) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value ?? defaultValue ?? ""}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current !== null) ref.current.indeterminate = checked === "indeterminate";
  }, [checked]);
  return (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked === true}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  );
}

function DateTimeInput({
  value,
  onChange,
  id,
  disabled,
  placeholder,
  min,
  max,
  className,
  "aria-label": ariaLabel,
}: DateTimeInputProps) {
  return (
    <input
      id={id}
      type="datetime-local"
      className={join("test-datetime-input", className)}
      value={value ?? ""}
      disabled={disabled}
      placeholder={placeholder}
      min={min}
      max={max}
      aria-label={ariaLabel}
      onChange={(event) => onChange?.(event.target.value === "" ? undefined : event.target.value)}
    />
  );
}

function Switch({ checked, onCheckedChange, disabled, id, "aria-label": ariaLabel }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
    />
  );
}

function Field({ label, description, error, required, htmlFor, children }: FieldProps) {
  return (
    <div className="test-field">
      {label !== undefined ? (
        <label htmlFor={htmlFor}>
          {label}
          {required === true ? " *" : null}
        </label>
      ) : null}
      {children}
      {description !== undefined ? (
        <span className="test-field-description">{description}</span>
      ) : null}
      {error !== undefined ? (
        <span className="test-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function Popover({ open, onOpenChange, trigger, children, className }: PopoverProps) {
  const element = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<{ onClick?: (event: MouseEvent) => void }>, {
        onClick: (event: MouseEvent) => {
          (trigger.props as { onClick?: (event: MouseEvent) => void }).onClick?.(event);
          onOpenChange(!open);
        },
      })
    : trigger;
  return (
    <div className="test-popover" data-open={open ? "true" : "false"}>
      {element}
      {open ? <div className={join("test-popover-content", className)}>{children}</div> : null}
    </div>
  );
}

function Menu({ trigger, items, "aria-label": ariaLabel }: MenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="test-menu" data-open={open ? "true" : "false"}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: test adapter mirrors the real trigger */}
      <span onClick={() => setOpen((current) => !current)} role="presentation">
        {trigger}
      </span>
      {open ? (
        <div role="menu" aria-label={ariaLabel}>
          {items.map((item, index) => (
            <Fragment key={typeof item.label === "string" ? item.label : index}>
              {item.separator === true ? <hr /> : null}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {item.label}
              </button>
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Tooltip({ trigger, content, side, disabled }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const element = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  });
  return (
    <span className="test-tooltip" data-side={side}>
      {element}
      {open && !disabled ? <span role="tooltip">{content}</span> : null}
    </span>
  );
}

function Tabs({ items, value, onValueChange, variant, "aria-label": ariaLabel }: TabsProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} data-variant={variant}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          disabled={item.disabled}
          onClick={() => onValueChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Dialog({ open, title, description, footer, children }: DialogProps) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true">
      {title !== undefined ? <h2>{title}</h2> : null}
      {description !== undefined ? <p>{description}</p> : null}
      {children}
      {footer}
    </div>
  );
}

function Drawer({ side, ...rest }: DrawerProps) {
  const dialog = Dialog(rest);
  return dialog === null ? null : <aside data-side={side}>{dialog}</aside>;
}

function Badge({ children, tone, variant }: BadgeProps) {
  return (
    <span data-testid="badge" data-tone={tone} data-variant={variant}>
      {children}
    </span>
  );
}

function Card({ children, title, description, actions, className }: CardProps) {
  return (
    <section className={join("test-card", className)}>
      {title !== undefined ? <header>{title}</header> : null}
      {description !== undefined ? <p>{description}</p> : null}
      {children}
      {actions}
    </section>
  );
}

const TableRoot = ({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) => (
  <table {...rest} className={join("test-table", className)} />
);
const TableHeader = ({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead {...rest} className={join("test-thead", className)} />
);
const TableBody = ({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody {...rest} className={join("test-tbody", className)} />
);
const TableRow = ({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr {...rest} className={join("test-row", className)} />
);
const TableHead = ({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th {...rest} className={join("test-th", className)} />
);
const TableCell = ({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td {...rest} className={join("test-td", className)} />
);
const TableCaption = ({ className, ...rest }: HTMLAttributes<HTMLTableCaptionElement>) => (
  <caption {...rest} className={join("test-caption", className)} />
);

function TestIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" />
    </svg>
  );
}

export const testAdapter: UiAdapter = {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  DateTimeInput,
  Switch,
  Field,
  Menu,
  Popover,
  Tooltip,
  Tabs,
  Dialog,
  Drawer,
  Badge,
  Card,
  Table: {
    Root: TableRoot,
    Header: TableHeader,
    Body: TableBody,
    Row: TableRow,
    Head: TableHead,
    Cell: TableCell,
    Caption: TableCaption,
  },
  icons: {
    ChevronDown: TestIcon,
    ChevronLeft: TestIcon,
    ChevronRight: TestIcon,
    ChevronUp: TestIcon,
    Check: TestIcon,
    X: TestIcon,
    Search: TestIcon,
    Copy: TestIcon,
    Eye: TestIcon,
    EyeOff: TestIcon,
    MoreHorizontal: TestIcon,
    Loader: TestIcon,
  },
  cx: join,
};
