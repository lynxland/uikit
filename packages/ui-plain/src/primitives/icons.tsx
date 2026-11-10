import type { IconProps, UiIcons } from "@lynxland/uikit-surfaces/adapter";
import type { ReactNode } from "react";
import { cx } from "./cx";

interface PlainIconProps extends IconProps {
  children: ReactNode;
}

/**
 * Inline icon set — no lucide/heroicons dependency. Icons are decorative by
 * default (`aria-hidden`); pass an `aria-label` to expose one, or use a
 * visually hidden label next to it.
 */
function PlainIcon({
  size = 16,
  className,
  children,
  "aria-label": ariaLabel,
  ...props
}: PlainIconProps) {
  const ariaHidden = props["aria-hidden"] ?? (ariaLabel === undefined ? true : undefined);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...props}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      className={cx("ui-plain-icon", className)}
    >
      {children}
    </svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </PlainIcon>
  );
}

export function ChevronLeft(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </PlainIcon>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </PlainIcon>
  );
}

export function ChevronUp(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <path d="m18 15-6-6-6 6" />
    </PlainIcon>
  );
}

export function Check(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </PlainIcon>
  );
}

export function X(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </PlainIcon>
  );
}

export function Search(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </PlainIcon>
  );
}

export function Copy(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </PlainIcon>
  );
}

export function Eye(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </PlainIcon>
  );
}

export function EyeOff(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.8" />
      <path d="M6.3 6.3A16.8 16.8 0 0 0 2.5 12S6 18 12 18a10 10 0 0 0 4.1-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </PlainIcon>
  );
}

export function MoreHorizontal(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </PlainIcon>
  );
}

export function Loader(props: IconProps) {
  return (
    <PlainIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
    </PlainIcon>
  );
}

export const icons: UiIcons = {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  X,
  Search,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Loader,
};
