"use client";

import * as React from "react";
import { hashIndex, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Company mark: a real favicon when we can resolve one, initials otherwise.
 *
 * Logos are fetched from DuckDuckGo's icon service, which needs no API key 
 * important for a project people fork and run without configuring anything.
 * Any failure falls back to a tinted monogram, so rows never show a broken box.
 */

const SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-14 text-lg",
} as const;

const TINTS = [
  "bg-tone-blue/15 text-tone-blue",
  "bg-tone-violet/15 text-tone-violet",
  "bg-tone-teal/15 text-tone-teal",
  "bg-tone-amber/15 text-tone-amber",
  "bg-tone-cyan/15 text-tone-cyan",
  "bg-tone-rose/15 text-tone-rose",
  "bg-tone-green/15 text-tone-green",
  "bg-tone-orange/15 text-tone-orange",
];

export interface CompanyAvatarProps {
  name: string;
  domain?: string | null;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  /** Skips the network request; useful in long virtualised lists. */
  monogramOnly?: boolean;
}

export function CompanyAvatar({
  name,
  domain,
  logoUrl,
  size = "md",
  className,
  monogramOnly = false,
}: CompanyAvatarProps) {
  // Track *which* source failed, so changing the domain retries automatically
  // without needing an effect to reset a boolean.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const src = logoUrl || (domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : null);
  const showImage = !monogramOnly && src && failedSrc !== src;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "font-runde font-semibold edge select-none",
        !showImage && TINTS[hashIndex(name, TINTS.length)],
        showImage && "bg-popover",
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="size-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** Person monogram. Deliberately no photo fetching, contacts are private. */
export function PersonAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-runde font-semibold edge select-none",
        TINTS[hashIndex(name, TINTS.length)],
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping monograms with a "+n" overflow chip. */
export function AvatarStack({
  names,
  max = 3,
  size = "sm",
  className,
}: {
  names: string[];
  max?: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;
  return (
    <span className={cn("flex items-center -space-x-1.5", className)}>
      {shown.map((name) => (
        <PersonAvatar
          key={name}
          name={name}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-muted font-runde font-semibold text-muted-foreground ring-2 ring-background",
            SIZES[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
