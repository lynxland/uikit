import type { IconProps, UiIcons } from "@lynxland/uikit-surfaces/adapter";
import {
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ChevronUp as ChevronUpIcon,
  Copy as CopyIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Loader as LoaderIcon,
  type LucideIcon,
  MoreHorizontal as MoreHorizontalIcon,
  Search as SearchIcon,
  X as XIcon,
} from "lucide-react";
import { cx } from "./cx";

function createIcon(Icon: LucideIcon, displayName: string) {
  const Component = function UiIcon({ size = 16, className, ...props }: IconProps) {
    return (
      <Icon
        size={size}
        className={cx("shrink-0", className)}
        aria-hidden="true"
        focusable="false"
        {...props}
      />
    );
  };
  Component.displayName = displayName;
  return Component;
}

export const ChevronDown = createIcon(ChevronDownIcon, "ChevronDown");
export const ChevronLeft = createIcon(ChevronLeftIcon, "ChevronLeft");
export const ChevronRight = createIcon(ChevronRightIcon, "ChevronRight");
export const ChevronUp = createIcon(ChevronUpIcon, "ChevronUp");
export const Check = createIcon(CheckIcon, "Check");
export const X = createIcon(XIcon, "X");
export const Search = createIcon(SearchIcon, "Search");
export const Copy = createIcon(CopyIcon, "Copy");
export const Eye = createIcon(EyeIcon, "Eye");
export const EyeOff = createIcon(EyeOffIcon, "EyeOff");
export const MoreHorizontal = createIcon(MoreHorizontalIcon, "MoreHorizontal");
export const Loader = createIcon(LoaderIcon, "Loader");

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
