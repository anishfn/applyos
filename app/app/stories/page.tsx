"use client";

import * as React from "react";
import { MessageSquare, Pencil, Plus, Search, Star, Trash2 } from "@/components/ui/icons";
import { EmptyState } from "@/components/common/empty-state";
import { InlineText } from "@/components/common/inline-edit";
import { Markdown, type MentionTarget } from "@/components/common/markdown";
import { MentionTextarea, type MentionSource } from "@/components/common/mention-textarea";
import { Segmented } from "@/components/common/form";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { COMPETENCY_CONFIG } from "@/lib/constants";
import { createStory, deleteStory, updateStory } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { formatRelative } from "@/lib/date";
import type { Competency, StarStory } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The story journal.
 *
 * Behavioural answers get written once and reused for years, so this is a
 * writing surface rather than a list of forms: entries on the left, one long
 * document on the right, everything saved as you type.
 */

/**
 * An entry is one markdown document, deliberately unprompted.
 *
 * The four STAR boxes were a form, and a form is a bad place to remember
 * something. `storyBody` folds an older four-field record into one document the
 * first time it is opened, so nothing written before this is lost.
 */
function storyBody(story: StarStory): string {
  if (story.body?.trim()) return story.body;
  const legacy = [story.situation, story.task, story.action, story.result].filter((part) =>
    part?.trim(),
  );
  return legacy.join("\n\n");
}

/** Vault-style tags: whatever `#competency` words appear in the note. */
function tagsIn(body: string): Competency[] {
  const known = new Set(Object.keys(COMPETENCY_CONFIG));
  const found = new Set<Competency>();
  for (const match of body.matchAll(/#([a-z_]+)/gi)) {
    const slug = match[1].toLowerCase();
    if (known.has(slug)) found.add(slug as Competency);
  }
  return [...found];
}

const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export default function StoriesPage() {
  const status = useStoreStatus();
  const { deleteWithUndo } = useAppUI();

  const stories = useCollection("stories");
  const companies = useCollection("companies");
  const contacts = useCollection("contacts");
  const applications = useCollection("applications");
  const [query, setQuery] = React.useState("");
  const [competency, setCompetency] = React.useState<Competency | "all">("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return stories
      .filter((story) => (competency === "all" ? true : story.competencies.includes(competency)))
      .filter((story) =>
        needle
          ? `${story.title} ${storyBody(story)}`.toLowerCase().includes(needle)
          : true,
      )
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [stories, query, competency]);

  // Follow the list rather than holding a dead id after a delete or a filter.
  const selected = visible.find((story) => story.id === selectedId) ?? visible[0] ?? null;

  // Anything worth referring to in an entry: the companies you have applied to,
  // the people you have spoken to, and the roles themselves.
  const mentionTargets = React.useMemo<MentionTarget[]>(() => {
    const applied = new Set(applications.map((application) => application.companyId));
    return [
      ...companies
        .filter((company) => applied.has(company.id))
        .map((company) => ({
          name: company.name,
          href: `/app/companies/${company.id}`,
          kind: "company" as const,
        })),
      ...contacts.map((contact) => ({
        name: contact.name,
        href: `/app/contacts/${contact.id}`,
        kind: "contact" as const,
      })),
      ...applications.map((application) => ({
        name: application.position,
        href: `/app/applications/${application.id}`,
        kind: "application" as const,
      })),
      ...Object.values(COMPETENCY_CONFIG).map((option) => ({
        name: option.value,
        kind: "tag" as const,
      })),
    ];
  }, [companies, contacts, applications]);

  const coverage = React.useMemo(() => {
    const covered = new Set(stories.flatMap((story) => story.competencies));
    return Object.values(COMPETENCY_CONFIG).map((config) => ({
      ...config,
      covered: covered.has(config.value),
    }));
  }, [stories]);

  const startNew = () => {
    const story = createStory({ title: "Untitled entry" });
    setSelectedId(story.id);
  };

  if (status.status !== "ready") return <ListSkeleton rows={4} />;

  const gaps = coverage.filter((item) => !item.covered);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        title="Stories"
        description="A journal of what actually happened. Write it once, reuse it in every round."
        actions={
          <Button variant="primary" size="sm" onClick={startNew}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">New entry</span>
          </Button>
        }
      />

      {stories.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={MessageSquare}
            title="Start your first entry"
            description="Write down what happened while it is fresh: the project, the argument, the thing you fixed. Four or five of these cover almost every behavioural question you will be asked."
            action={{ label: "Write one now", onClick: startNew }}
          />
        </Surface>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-12">
          {/* Index ------------------------------------------------------- */}
          <Surface className="flex min-h-0 flex-col overflow-hidden lg:col-span-4 xl:col-span-3">
            <div className="shrink-0 border-b border-foreground/[0.06] p-2.5">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  placeholder="Search your stories…"
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="no-scrollbar mt-2 flex gap-1 overflow-x-auto">
                <FilterChip active={competency === "all"} onClick={() => setCompetency("all")}>
                  All
                </FilterChip>
                {Object.values(COMPETENCY_CONFIG).map((option) => (
                  <FilterChip
                    key={option.value}
                    active={competency === option.value}
                    onClick={() => setCompetency(option.value)}
                  >
                    {option.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto">
              {visible.map((story) => {
                const active = story.id === selected?.id;
                return (
                  <li key={story.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(story.id)}
                      className={cn(
                        "flex w-full cursor-pointer flex-col gap-1 border-b border-foreground/[0.05] px-3 py-2.5 text-left",
                        "transition-colors duration-150",
                        active ? "bg-foreground/[0.05]" : "hover:bg-foreground/[0.025]",
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        {story.favorite && (
                          <Star className="size-3 shrink-0 fill-primary text-primary" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {story.title || "Untitled entry"}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                        {storyBody(story).replace(/[#*`>]/g, "").trim() || "Nothing written yet."}
                      </span>
                      <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{formatRelative(story.updatedAt)}</span>
                        {story.competencies.length > 0 && (
                          <span className="truncate">
                            {story.competencies
                              .map((item) => COMPETENCY_CONFIG[item].label)
                              .join(", ")}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nothing matches that.
                </li>
              )}
            </ul>

            {gaps.length > 0 && (
              <div className="shrink-0 border-t border-foreground/[0.06] p-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Not covered yet: {gaps.map((gap) => gap.label).join(", ")}.
                </p>
              </div>
            )}
          </Surface>

          {/* Entry -------------------------------------------------------- */}
          {selected ? (
            <StoryEditor
              key={selected.id}
              story={selected}
              mentions={mentionTargets}
              onDelete={() => deleteWithUndo(deleteStory(selected.id))}
            />
          ) : (
            <Surface className="flex items-center justify-center lg:col-span-8 xl:col-span-9">
              <EmptyState
                icon={MessageSquare}
                title="Pick an entry"
                description="Or start a new one."
                action={{ label: "New entry", onClick: startNew }}
              />
            </Surface>
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        "transition-colors duration-150",
        active
          ? "bg-primary/15 text-primary-ink"
          : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The entry.
 *
 * A vault note: title at the top of the page, the document filling the pane,
 * nothing in the margins. Write mode is the source text; read mode renders it.
 * Tags are whatever `#words` are in the note, the way a vault does it, rather
 * than a separate row of chips to keep in sync.
 */
function StoryEditor({
  story,
  mentions,
  onDelete,
}: {
  story: StarStory;
  mentions: MentionTarget[];
  onDelete: () => void;
}) {
  const initial = storyBody(story);
  const [draft, setDraft] = React.useState(initial);
  const [lastSaved, setLastSaved] = React.useState(initial);
  const [mode, setMode] = React.useState<"write" | "read">(initial.trim() ? "read" : "write");

  // Adjust during render rather than in an effect: if the record changes
  // underneath (undo, another tab), the draft follows it.
  const current = storyBody(story);
  if (current !== lastSaved) {
    setLastSaved(current);
    setDraft(current);
  }

  const save = (body: string) => {
    if (body === current) return;
    updateStory(story.id, { body, competencies: tagsIn(body) });
  };

  const sources = React.useMemo<MentionSource[]>(() => {
    const label: Record<MentionTarget["kind"], string> = {
      company: "Company",
      contact: "Person",
      application: "Role",
      tag: "Tag",
    };
    const records = mentions
      .filter((target) => target.kind !== "tag")
      .map((target) => ({ value: target.name, label: target.name, hint: label[target.kind] }));
    return [
      { trigger: "@", options: records },
      { trigger: "[[", options: records, closing: "]]" },
      {
        trigger: "#",
        options: Object.values(COMPETENCY_CONFIG).map((option) => ({
          value: option.value,
          label: option.label,
          hint: "Tag",
        })),
      },
    ];
  }, [mentions]);

  /** Flips one `- [ ]` line in the source and saves. */
  const toggleTask = (lineIndex: number, checked: boolean) => {
    const lines = draft.split("\n");
    lines[lineIndex] = lines[lineIndex].replace(
      /\[([ xX])\]/,
      checked ? "[x]" : "[ ]",
    );
    const next = lines.join("\n");
    setDraft(next);
    save(next);
  };

  return (
    <Surface className="flex min-h-0 flex-col overflow-hidden lg:col-span-8 xl:col-span-9">
      <div className="flex shrink-0 items-center gap-1 border-b border-foreground/[0.06] px-3 py-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {wordCount(draft)} word{wordCount(draft) === 1 ? "" : "s"} · edited{" "}
          {formatRelative(story.updatedAt)}
        </span>
        <Segmented
          value={mode}
          onChange={(next) => {
            if (next === "read") save(draft);
            setMode(next);
          }}
          ariaLabel="Entry mode"
          size="sm"
          options={[
            { value: "write", label: <Pencil className="size-3.5" />, title: "Write" },
            { value: "read", label: <MessageSquare className="size-3.5" />, title: "Read" },
          ]}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={story.favorite ? "Unstar" : "Star"}
          onClick={() => updateStory(story.id, { favorite: !story.favorite })}
        >
          <Star className={cn("size-4", story.favorite && "fill-primary text-primary")} />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Delete entry" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7 py-6">
        <InlineText
          value={story.title}
          onCommit={(title) => updateStory(story.id, { title: title || "Untitled entry" })}
          ariaLabel="entry title"
          className="-ml-1.5 mb-4"
          textClassName="font-runde text-2xl leading-8 font-bold tracking-tight"
          inputClassName="h-11 font-runde text-2xl font-bold tracking-tight"
        />

        {mode === "write" ? (
          <MentionTextarea
            value={draft}
            onChange={setDraft}
            onBlur={() => save(draft)}
            sources={sources}
            autoFocus={!initial.trim()}
            className="text-[14px] leading-7"
            placeholder={
              "Write what happened. Where, when, who, how it went.\n\n" +
              "@ mentions a company or a person, [[ ]] links to one, # tags the note.\n" +
              "Markdown all works: # headings, - lists, - [ ] tasks, > quotes, tables, `code`."
            }
          />
        ) : draft.trim() ? (
          <Markdown value={draft} targets={mentions} onToggleTask={toggleTask} />
        ) : (
          <button
            type="button"
            onClick={() => setMode("write")}
            className="cursor-pointer py-6 text-left text-sm text-muted-foreground"
          >
            Empty note. Click to start writing.
          </button>
        )}
      </div>
    </Surface>
  );
}
