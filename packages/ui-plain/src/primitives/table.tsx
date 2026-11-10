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
  return <table ref={ref} className={cx("ui-plain-table", className)} {...props} />;
});

const Header = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableHeader({ className, ...props }, ref) {
    return <thead ref={ref} className={cx("ui-plain-table-header", className)} {...props} />;
  },
);

const Body = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableBody({ className, ...props }, ref) {
    return <tbody ref={ref} className={cx("ui-plain-table-body", className)} {...props} />;
  },
);

const Row = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(function TableRow(
  { className, ...props },
  ref,
) {
  return <tr ref={ref} className={cx("ui-plain-table-row", className)} {...props} />;
});

const Head = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  function TableHead({ className, ...props }, ref) {
    return <th ref={ref} className={cx("ui-plain-table-head", className)} {...props} />;
  },
);

const Cell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  function TableCell({ className, ...props }, ref) {
    return <td ref={ref} className={cx("ui-plain-table-cell", className)} {...props} />;
  },
);

const Caption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  function TableCaption({ className, ...props }, ref) {
    return <caption ref={ref} className={cx("ui-plain-table-caption", className)} {...props} />;
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
