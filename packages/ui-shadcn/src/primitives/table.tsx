import type { TableSlots } from "@lynxland/uikit-surfaces/adapter";
import {
  forwardRef,
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cx } from "./cx";

const Root = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(function TableRoot(
  { className, ...props },
  ref,
) {
  return (
    <div className="relative w-full overflow-x-auto" data-slot="table-container">
      <table ref={ref} className={cx("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
});

const Header = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableHeader({ className, ...props }, ref) {
    return (
      <thead
        ref={ref}
        className={cx("[&_tr]:border-b [&_tr]:border-[var(--border)]", className)}
        {...props}
      />
    );
  },
);

const Body = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableBody({ className, ...props }, ref) {
    return <tbody ref={ref} className={cx("[&_tr:last-child]:border-0", className)} {...props} />;
  },
);

const Row = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(function TableRow(
  { className, ...props },
  ref,
) {
  return (
    <tr
      ref={ref}
      className={cx(
        "border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/50 data-[state=selected]:bg-[var(--muted)]",
        className,
      )}
      {...props}
    />
  );
});

const Head = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  function TableHead({ className, ...props }, ref) {
    return (
      <th
        ref={ref}
        className={cx(
          "h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)] [&:has([role=checkbox])]:pr-0",
          className,
        )}
        {...props}
      />
    );
  },
);

const Cell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  function TableCell({ className, ...props }, ref) {
    return (
      <td
        ref={ref}
        className={cx("p-3 align-middle [&:has([role=checkbox])]:pr-0", className)}
        {...props}
      />
    );
  },
);

const Caption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  function TableCaption({ className, ...props }, ref) {
    return (
      <caption
        ref={ref}
        className={cx("mt-4 text-sm text-[var(--muted-foreground)]", className)}
        {...props}
      />
    );
  },
);

export const Table: TableSlots = {
  Root,
  Header,
  Body,
  Row,
  Head,
  Cell,
  Caption,
};
