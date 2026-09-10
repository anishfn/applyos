"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Markdown, rendered.
 *
 * Deliberately not a library: an entry needs headings, lists, tasks, tables,
 * quotes, code and emphasis, and owning ~250 lines of parser buys two things a
 * dependency would not. `[[Wikilinks]]` and `@mentions` resolve to real records
 * in the workspace, and a task checkbox can write back into the source text.
 *
 * Anything it does not recognise renders as plain text, which is the right
 * failure mode for notes.
 */

export interface MentionTarget {
  /** The literal text after `@` or inside `[[ ]]`. */
  name: string;
  href?: string;
  kind: "company" | "contact" | "application" | "tag";
}

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* -------------------------------------------------------------------------- */
/* Inline                                                                      */
/* -------------------------------------------------------------------------- */

function Chip({ target }: { target: MentionTarget }) {
  const isTag = target.kind === "tag";
  const body = (
    <span
      className={cn(
        "mx-px inline-flex items-baseline rounded-md px-1 py-px text-[0.95em] font-medium",
        isTag ? "bg-foreground/[0.07] text-muted-foreground" : "bg-primary/15 text-primary-ink",
      )}
    >
      {isTag ? "#" : "@"}
      {target.name}
    </span>
  );
  return target.href ? (
    <Link href={target.href} className="transition-opacity hover:opacity-75">
      {body}
    </Link>
  ) : (
    body
  );
}

function WikiLink({ target, label }: { target?: MentionTarget; label: string }) {
  const body = (
    <span
      className={cn(
        "underline decoration-dotted underline-offset-[3px]",
        target?.href ? "text-primary-ink" : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
  return target?.href ? (
    <Link href={target.href} className="transition-opacity hover:opacity-75">
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * One regex over the line, longest-token-first, so `**bold**` is not eaten by
 * the italic rule and a wikilink is not eaten by the link rule.
 */
const INLINE = new RegExp(
  [
    "`[^`]+`", // code
    "\\[\\[[^\\]]+\\]\\]", // wikilink
    "!\\[[^\\]]*\\]\\([^)]+\\)", // image
    "\\[[^\\]]+\\]\\([^)]+\\)", // link
    "\\*\\*\\*[^*]+\\*\\*\\*", // bold italic
    "\\*\\*[^*]+\\*\\*", // bold
    "~~[^~]+~~", // strikethrough
    "\\*[^*\\n]+\\*", // italic
    "_[^_\\n]+_", // italic
    "https?://[^\\s)]+", // autolink
    "#[a-z0-9_-]{2,}", // tag
  ].join("|"),
  "gi",
);

function renderInline(
  text: string,
  targets: MentionTarget[],
  keyBase: string,
): React.ReactNode[] {
  const byName = new Map(targets.map((target) => [target.name.toLowerCase(), target]));
  const mentionNames = targets
    .filter((target) => target.kind !== "tag")
    .map((target) => target.name.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRe);
  const mentionRe = mentionNames.length
    ? new RegExp(`@(${mentionNames.join("|")})\\b`, "gi")
    : null;

  const out: React.ReactNode[] = [];
  let key = 0;
  const push = (node: React.ReactNode) => out.push(<React.Fragment key={`${keyBase}-${key++}`}>{node}</React.Fragment>);

  /** Second pass over plain runs: @mentions only. */
  const pushPlain = (value: string) => {
    if (!mentionRe) return push(value);
    let cursor = 0;
    for (const match of value.matchAll(mentionRe)) {
      const start = match.index ?? 0;
      if (start > cursor) push(value.slice(cursor, start));
      push(<Chip target={byName.get(match[1].toLowerCase()) ?? { name: match[1], kind: "company" }} />);
      cursor = start + match[0].length;
    }
    if (cursor < value.length) push(value.slice(cursor));
  };

  let cursor = 0;
  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > cursor) pushPlain(text.slice(cursor, start));
    cursor = start + token.length;

    if (token.startsWith("`")) {
      push(
        <code className="rounded bg-foreground/[0.07] px-1 py-px font-mono text-[0.88em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[[")) {
      const label = token.slice(2, -2).trim();
      push(<WikiLink label={label} target={byName.get(label.toLowerCase())} />);
    } else if (token.startsWith("![")) {
      const match2 = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(token);
      if (match2) {
        push(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match2[2]}
            alt={match2[1]}
            className="my-2 max-h-96 rounded-xl edge"
          />,
        );
      } else push(token);
    } else if (token.startsWith("[")) {
      const match2 = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (match2) {
        push(
          <a
            href={match2[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary-ink underline underline-offset-2"
          >
            {match2[1]}
          </a>,
        );
      } else push(token);
    } else if (token.startsWith("***")) {
      push(<strong className="font-semibold italic">{token.slice(3, -3)}</strong>);
    } else if (token.startsWith("**")) {
      push(<strong className="font-semibold">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("~~")) {
      push(<s className="text-muted-foreground">{token.slice(2, -2)}</s>);
    } else if (token.startsWith("*") || token.startsWith("_")) {
      push(<em>{token.slice(1, -1)}</em>);
    } else if (/^https?:\/\//i.test(token)) {
      push(
        <a
          href={token}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary-ink underline underline-offset-2 break-all"
        >
          {token.replace(/^https?:\/\//, "")}
        </a>,
      );
    } else if (token.startsWith("#")) {
      const slug = token.slice(1);
      push(<Chip target={byName.get(slug.toLowerCase()) ?? { name: slug, kind: "tag" }} />);
    } else {
      push(token);
    }
  }
  if (cursor < text.length) pushPlain(text.slice(cursor));
  return out;
}

/* -------------------------------------------------------------------------- */
/* Blocks                                                                      */
/* -------------------------------------------------------------------------- */

const HEADING_CLASS = [
  "font-runde text-[1.5rem] leading-8 font-bold tracking-tight",
  "font-runde text-xl leading-7 font-semibold tracking-tight",
  "font-runde text-base font-semibold tracking-tight",
  "font-runde text-sm font-semibold tracking-tight",
  "text-sm font-semibold",
  "text-[13px] font-semibold text-muted-foreground",
];

export function Markdown({
  value,
  targets = [],
  onToggleTask,
  className,
}: {
  value: string;
  targets?: MentionTarget[];
  /** Given the source line index, writes the task's new state back. */
  onToggleTask?: (lineIndex: number, checked: boolean) => void;
  className?: string;
}) {
  const blocks = React.useMemo(() => {
    const lines = value.replace(/\r\n/g, "\n").split("\n");
    const out: React.ReactNode[] = [];
    let paragraph: string[] = [];

    const flushParagraph = () => {
      if (paragraph.length === 0) return;
      const text = paragraph.join(" ");
      out.push(
        <p key={`p${out.length}`} className="text-[14px] leading-7">
          {renderInline(text, targets, `p${out.length}`)}
        </p>,
      );
      paragraph = [];
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        continue;
      }

      // Fenced code
      if (trimmed.startsWith("```")) {
        flushParagraph();
        const language = trimmed.slice(3).trim();
        const body: string[] = [];
        index += 1;
        while (index < lines.length && !lines[index].trim().startsWith("```")) {
          body.push(lines[index]);
          index += 1;
        }
        out.push(
          <pre
            key={`c${out.length}`}
            className="overflow-x-auto rounded-xl bg-foreground/[0.05] p-3 edge"
          >
            {language && (
              <span className="mb-1 block font-mono text-[10px] text-muted-foreground">
                {language}
              </span>
            )}
            <code className="font-mono text-[12px] leading-5">{body.join("\n")}</code>
          </pre>,
        );
        continue;
      }

      // Table
      if (trimmed.startsWith("|") && lines[index + 1]?.trim().match(/^\|[\s:|-]+\|$/)) {
        flushParagraph();
        const cells = (row: string) =>
          row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
        const header = cells(trimmed);
        index += 2;
        const rows: string[][] = [];
        while (index < lines.length && lines[index].trim().startsWith("|")) {
          rows.push(cells(lines[index]));
          index += 1;
        }
        index -= 1;
        out.push(
          <div key={`t${out.length}`} className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-foreground/[0.1]">
                  {header.map((cell, cellIndex) => (
                    <th key={cellIndex} className="px-2 py-1.5 text-left font-semibold">
                      {renderInline(cell, targets, `th${out.length}-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-foreground/[0.05] last:border-b-0">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-2 py-1.5 align-top">
                        {renderInline(cell, targets, `td${out.length}-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }

      // Heading
      const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
      if (heading) {
        flushParagraph();
        const level = heading[1].length;
        out.push(
          <p key={`h${out.length}`} className={cn(HEADING_CLASS[level - 1], level <= 2 && "mt-2")}>
            {renderInline(heading[2], targets, `h${out.length}`)}
          </p>,
        );
        continue;
      }

      // Rule
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        flushParagraph();
        out.push(<hr key={`hr${out.length}`} className="border-foreground/[0.09]" />);
        continue;
      }

      // Quote, possibly several lines
      if (trimmed.startsWith(">")) {
        flushParagraph();
        const body: string[] = [];
        while (index < lines.length && lines[index].trim().startsWith(">")) {
          body.push(lines[index].trim().replace(/^>\s?/, ""));
          index += 1;
        }
        index -= 1;
        out.push(
          <blockquote
            key={`q${out.length}`}
            className="border-l-2 border-primary/40 pl-3 text-[14px] leading-7 text-muted-foreground"
          >
            {renderInline(body.join(" "), targets, `q${out.length}`)}
          </blockquote>,
        );
        continue;
      }

      // Lists, including tasks and one level of nesting
      const listItem = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
      if (listItem) {
        flushParagraph();
        const items: Array<{ depth: number; ordered: boolean; text: string; line: number }> = [];
        while (index < lines.length) {
          const match = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[index]);
          if (!match) break;
          items.push({
            depth: Math.min(2, Math.floor(match[1].length / 2)),
            ordered: /\d/.test(match[2]),
            text: match[3],
            line: index,
          });
          index += 1;
        }
        index -= 1;

        out.push(
          <ul key={`l${out.length}`} className="flex flex-col gap-1.5">
            {items.map((item) => {
              const task = /^\[([ xX])\]\s*(.*)$/.exec(item.text);
              return (
                <li
                  key={item.line}
                  className={cn(
                    "flex gap-2 text-[14px] leading-7",
                    item.depth === 1 && "ml-5",
                    item.depth === 2 && "ml-10",
                  )}
                >
                  {task ? (
                    <button
                      type="button"
                      disabled={!onToggleTask}
                      onClick={() => onToggleTask?.(item.line, task[1] === " ")}
                      aria-label={task[1] === " " ? "Mark done" : "Mark not done"}
                      className={cn(
                        "mt-[7px] grid size-3.5 shrink-0 place-items-center rounded-[4px] transition-colors",
                        task[1] === " "
                          ? "bg-foreground/[0.04] shadow-[inset_0_0_0_1px_var(--edge-line-strong)] hover:bg-foreground/[0.09]"
                          : "bg-primary text-primary-foreground",
                        onToggleTask && "cursor-pointer",
                      )}
                    >
                      {task[1] !== " " && (
                        <svg viewBox="0 0 16 16" className="size-full" fill="none">
                          <path
                            d="M4 8.4 6.8 11.2 12 5.4"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "shrink-0 text-muted-foreground",
                        item.ordered ? "font-mono text-[12px] leading-7" : "leading-7",
                      )}
                    >
                      {item.ordered ? "•" : "•"}
                    </span>
                  )}
                  <span className={cn("min-w-0", task && task[1] !== " " && "text-muted-foreground line-through")}>
                    {renderInline(task ? task[2] : item.text, targets, `li${item.line}`)}
                  </span>
                </li>
              );
            })}
          </ul>,
        );
        continue;
      }

      paragraph.push(trimmed);
    }
    flushParagraph();
    return out;
  }, [value, targets, onToggleTask]);

  if (!value.trim()) return null;

  return <div className={cn("flex flex-col gap-4", className)}>{blocks}</div>;
}
