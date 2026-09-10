"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A textarea that completes mentions.
 *
 * Types `@` for anything in the workspace and `#` for a tag; the token is
 * written into the text as plain words, so an entry stays readable and portable
 * and re-resolves if a company is renamed later. Nothing is stored as a
 * reference, which is the right trade for notes people may export.
 */

export interface MentionOption {
  /** Inserted after the trigger. */
  value: string;
  label: string;
  hint?: string;
  /** Called when this option is chosen, for side effects like adding a tag. */
  onPick?: () => void;
}

export interface MentionSource {
  /** What starts the token. `[[` behaves like a vault link. */
  trigger: "@" | "#" | "[[";
  options: MentionOption[];
  /** Written after the value, for triggers that come in pairs. */
  closing?: string;
}

export function MentionTextarea({
  value,
  onChange,
  onBlur,
  sources,
  placeholder,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  sources: MentionSource[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = React.useState<{
    trigger: MentionSource["trigger"];
    text: string;
    start: number;
  } | null>(null);
  const [active, setActive] = React.useState(0);

  const source = sources.find((item) => item.trigger === query?.trigger);
  const matches = React.useMemo(() => {
    if (!query || !source) return [];
    const needle = query.text.toLowerCase();
    return source.options
      .filter((option) => option.label.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [query, source]);

  /** Reads the token immediately before the caret, if there is one. */
  const detect = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    // `[[` first: it is the longer opener and would otherwise never match.
    const wiki = /\[\[([\w' -]{0,40})$/.exec(before);
    if (wiki && sources.some((item) => item.trigger === "[[")) {
      return { trigger: "[[" as const, text: wiki[1], start: caret - wiki[1].length - 2 };
    }
    const match = /(^|[\s(])([@#])([\w' -]{0,32})$/.exec(before);
    if (!match) return null;
    const trigger = match[2] as "@" | "#";
    if (!sources.some((item) => item.trigger === trigger)) return null;
    return { trigger, text: match[3], start: caret - match[3].length - 1 };
  };

  const insert = (option: MentionOption) => {
    if (!query) return;
    const node = ref.current;
    const caret = node?.selectionStart ?? value.length;
    const closing = source?.closing ?? "";
    const token = `${query.trigger}${option.value}${closing} `;
    const next = `${value.slice(0, query.start)}${token}${value.slice(caret)}`;
    onChange(next);
    option.onPick?.();
    setQuery(null);
    // Put the caret after the inserted mention on the next frame, once React
    // has written the new value.
    const position = query.start + token.length;
    requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(position, position);
    });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setQuery(detect(event.target.value, event.target.selectionStart));
          setActive(0);
        }}
        onClick={(event) =>
          setQuery(detect(value, (event.target as HTMLTextAreaElement).selectionStart))
        }
        onBlur={() => {
          // Let a click on the menu land before the menu unmounts.
          setTimeout(() => setQuery(null), 120);
          onBlur?.();
        }}
        onKeyDown={(event) => {
          if (!query || matches.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index - 1 + matches.length) % matches.length);
          } else if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            insert(matches[active]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setQuery(null);
          }
        }}
        className={cn(
          "min-h-0 w-full flex-1 resize-none bg-transparent text-[13px] leading-6 outline-none",
          "placeholder:text-muted-foreground/70",
          className,
        )}
      />

      {query && matches.length > 0 && (
        <div className="absolute bottom-2 left-0 z-20 w-64 overflow-hidden rounded-xl bg-popover p-1 edge-strong">
          <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">
            {query.trigger === "#" ? "Tag" : query.trigger === "[[" ? "Link to" : "Mention"}
          </p>
          {matches.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert(option)}
              onMouseEnter={() => setActive(index)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs",
                index === active ? "bg-foreground/[0.07]" : "hover:bg-foreground/[0.04]",
              )}
            >
              <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
              {option.hint && (
                <span className="shrink-0 text-[10px] text-muted-foreground">{option.hint}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
