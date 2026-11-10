import { type ReactNode, useState } from "react";
import { cx } from "./classes";
import type { StatusTone } from "./status-badge";
import { StatusDot } from "./status-dot";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  /** Image URL. When omitted (or it fails to load) the fallback renders. */
  src?: string;
  /** Accessible name and the source for default initials. */
  alt?: string;
  /** Explicit fallback content; defaults to initials derived from `alt`. */
  fallback?: ReactNode;
  size?: AvatarSize | number;
  /** Optional presence dot in the bottom-right corner. */
  status?: StatusTone;
  className?: string;
}

/** First letters of the first/last words (`Ada Lovelace` → `AL`). */
export function avatarInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) return "";
  const first = words[0] ?? "";
  if (words.length === 1) return first.slice(0, 2).toUpperCase();
  const last = words[words.length - 1] ?? "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/**
 * Account/organization avatar with an image, initials fallback and an optional
 * status dot. Pure display: it does not fetch, cache or know the entity.
 */
export function Avatar({ src, alt, fallback, size = "md", status, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== undefined && src !== "" && failedSrc !== src;
  const initials = avatarInitials(alt ?? "");
  const fallbackContent = fallback ?? initials;
  const numericSize = typeof size === "number";
  const label = alt !== undefined && alt !== "" ? alt : undefined;

  return (
    <span
      className={cx("ui-avatar", className)}
      data-size={numericSize ? "custom" : size}
      {...(label !== undefined ? { role: "img" as const, "aria-label": label } : {})}
      style={numericSize ? { width: size, height: size } : undefined}
    >
      {showImage ? (
        <img
          className="ui-avatar__image"
          src={src}
          alt=""
          aria-hidden="true"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className="ui-avatar__fallback" aria-hidden="true">
          {fallbackContent}
        </span>
      )}
      {status !== undefined ? <StatusDot tone={status} className="ui-avatar__status" /> : null}
    </span>
  );
}
