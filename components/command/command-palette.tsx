"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Building2,
  Download,
  FileText,
  ListTodo,
  Send,
  Sparkles,
  Users,
  Video,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { CompanyAvatar, PersonAvatar } from "@/components/common/company-avatar";
import { StatusBadge } from "@/components/common/badges";
import { ContrastIcon } from "@/components/layout/theme-toggle";
import { useAppUI } from "@/components/providers/app-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { useCollection } from "@/lib/data/hooks";
import { exportEverything } from "@/lib/export";
import { NAV_GROUPS } from "@/lib/navigation";
import { applyTheme, isDarkNow } from "@/lib/theme";
import { searchWorkspace, type SearchHit } from "@/lib/search";

/**
 * One palette for both jobs.
 *
 * Empty query shows every command. Typing searches the workspace *and* narrows
 * the commands, so "pipe" finds the Pipeline page as readily as it finds a
 * company. cmdk's own filtering is off: records are ranked in `lib/search.ts`
 * and commands are matched here, both against the same query.
 */

/** Every word in the query has to appear somewhere in the command's text. */
function commandMatches(query: string, haystack: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const target = haystack.toLowerCase();
  return terms.every((term) => target.includes(term));
}
export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, setPaletteOpen, paletteMode, openQuickAdd } = useAppUI();
  const [query, setQuery] = React.useState("");
  const [deferredQuery, setDeferredQuery] = React.useState("");

  const applications = useCollection("applications");
  const companies = useCollection("companies");
  const contacts = useCollection("contacts");
  const interviews = useCollection("interviews");
  const tasks = useCollection("tasks");
  const jobs = useCollection("jobs");
  const documents = useCollection("documents");
  const resumes = useCollection("resumes");
  const notes = useCollection("notes");
  const stories = useCollection("stories");

  // Debounced so typing stays smooth against a large workspace.
  React.useEffect(() => {
    const timer = setTimeout(() => setDeferredQuery(query), 90);
    return () => clearTimeout(timer);
  }, [query]);

  const hits = React.useMemo(() => {
    if (deferredQuery.trim().length === 0) return [];
    return searchWorkspace(deferredQuery, {
      applications,
      companies,
      contacts,
      interviews,
      tasks,
      jobs,
      documents,
      resumes,
      notes,
      stories,
    });
  }, [
    deferredQuery,
    applications,
    companies,
    contacts,
    interviews,
    tasks,
    jobs,
    documents,
    resumes,
    notes,
    stories,
  ]);

  const run = React.useCallback(
    (action: () => void) => {
      setPaletteOpen(false);
      // Closing this way skips the dialog's own onOpenChange, so the query has
      // to be reset here too, or the palette reopens on stale results.
      setQuery("");
      setDeferredQuery("");
      // Let the dialog close before navigating, so the exit animation plays.
      requestAnimationFrame(action);
    },
    [setPaletteOpen],
  );

  const grouped = React.useMemo(() => {
    const groups = new Map<string, SearchHit[]>();
    for (const hit of hits) {
      const list = groups.get(hit.groupLabel) ?? [];
      list.push(hit);
      groups.set(hit.groupLabel, list);
    }
    return [...groups.entries()];
  }, [hits]);

  const searching = deferredQuery.trim().length > 0;

  // One list, rendered in groups when idle and filtered flat when searching.
  const commands = React.useMemo<PaletteCommand[]>(
    () => [
      { group: "Create", label: "Add application", keywords: "new job apply role", shortcut: "A", icon: <FileText className="size-4" />, onSelect: () => run(() => openQuickAdd("application")) },
      { group: "Create", label: "Save a job", keywords: "bookmark wishlist later", shortcut: "J", icon: <Bookmark className="size-4" />, onSelect: () => run(() => openQuickAdd("job")) },
      { group: "Create", label: "Add task", keywords: "todo reminder", shortcut: "T", icon: <ListTodo className="size-4" />, onSelect: () => run(() => openQuickAdd("task")) },
      { group: "Create", label: "Schedule interview", keywords: "round call onsite", shortcut: "I", icon: <Video className="size-4" />, onSelect: () => run(() => openQuickAdd("interview")) },
      { group: "Create", label: "Add contact", keywords: "person recruiter referral", shortcut: "C", icon: <Users className="size-4" />, onSelect: () => run(() => openQuickAdd("contact")) },
      { group: "Create", label: "Add company", keywords: "employer org", icon: <Building2 className="size-4" />, onSelect: () => run(() => openQuickAdd("company")) },
      { group: "Create", label: "Schedule follow-up", keywords: "nudge chase email", icon: <Send className="size-4" />, onSelect: () => run(() => openQuickAdd("follow_up")) },
      { group: "Create", label: "Add STAR story", keywords: "behavioural example", icon: <Sparkles className="size-4" />, onSelect: () => run(() => openQuickAdd("story")) },
      ...NAV_GROUPS.flatMap((group) => group.items).map((item) => ({
        group: "Go to" as const,
        label: item.label,
        keywords: `open page ${item.description ?? ""}`,
        chord: item.chord,
        icon: <item.icon className="size-4" />,
        onSelect: () => run(() => router.push(item.href)),
      })),
      { group: "Workspace", label: "Toggle theme", keywords: "dark light appearance", icon: <ContrastIcon className="size-4" />, onSelect: () => run(() => applyTheme(isDarkNow() ? "light" : "dark")) },
      { group: "Workspace", label: "Export all data (JSON)", keywords: "download backup", icon: <Download className="size-4" />, onSelect: () => run(() => { exportEverything(); toast.success("Workspace exported"); }) },
    ],
    [run, openQuickAdd, router],
  );

  const matchedCommands = React.useMemo(() => {
    if (!searching) return [];
    return commands
      .filter((command) => commandMatches(deferredQuery, `${command.label} ${command.keywords}`))
      .slice(0, 6);
  }, [commands, deferredQuery, searching]);

  /**
   * With cmdk's filtering off, nothing highlights itself, so Enter would do
   * nothing. The highlight is derived instead: keep whatever the arrow keys
   * chose while it still exists, otherwise fall back to the first row.
   */
  const [highlighted, setHighlighted] = React.useState("");
  const values = React.useMemo(
    () =>
      searching
        ? [...matchedCommands.map((command) => command.label), ...hits.map((hit) => hit.id)]
        : commands.map((command) => command.label),
    [searching, matchedCommands, hits, commands],
  );
  const known = React.useMemo(
    () => new Set(values.map((value) => value.toLowerCase())),
    [values],
  );
  const selected = known.has(highlighted.toLowerCase()) ? highlighted : (values[0] ?? "");

  return (
    <CommandDialog
      open={paletteOpen}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("");
          setDeferredQuery("");
        }
        setPaletteOpen(open);
      }}
      shouldFilter={false}
      value={selected}
      onValueChange={setHighlighted}
      title="Command palette"
      description="Search everything or run a command"
      showCloseButton={false}
      className="top-[12%] max-w-xl translate-y-0 sm:max-w-2xl"
    >
      <CommandInput
        placeholder={
          paletteMode === "search"
            ? "Search applications, companies, contacts…"
            : "Type a command or search…"
        }
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[min(28rem,60vh)]">
        <CommandEmpty>
          <div className="py-6 text-center">
            <p className="text-sm font-medium">No matches for “{deferredQuery}”</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a company, a role, or a person&apos;s name.
            </p>
          </div>
        </CommandEmpty>

        {searching && matchedCommands.length > 0 && (
          <CommandGroup heading={`Commands · ${matchedCommands.length}`}>
            {matchedCommands.map((command) => (
              <PaletteAction
                key={`${command.group}-${command.label}`}
                icon={command.icon}
                label={command.label}
                shortcut={command.shortcut}
                chord={command.chord}
                onSelect={command.onSelect}
              />
            ))}
          </CommandGroup>
        )}

        {searching &&
          grouped.map(([label, items]) => (
            <CommandGroup key={label} heading={`${label} · ${items.length}`}>
              {items.map((hit) => (
                <CommandItem
                  key={hit.id}
                  value={hit.id}
                  onSelect={() => run(() => router.push(hit.href))}
                  className="gap-2.5"
                >
                  <HitIcon hit={hit} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{hit.title}</span>
                    {hit.subtitle && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {hit.subtitle}
                      </span>
                    )}
                  </span>
                  {hit.status && <StatusBadge status={hit.status} size="sm" />}
                  {hit.meta && (
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {hit.meta}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

        {!searching &&
          (["Create", "Go to", "Workspace"] as const).map((group) => (
            <CommandGroup key={group} heading={group}>
              {commands
                .filter((command) => command.group === group)
                .map((command) => (
                  <PaletteAction
                    key={`${group}-${command.label}`}
                    icon={command.icon}
                    label={command.label}
                    shortcut={command.shortcut}
                    chord={command.chord}
                    onSelect={command.onSelect}
                  />
                ))}
            </CommandGroup>
          ))}
      </CommandList>

      <div className="flex items-center gap-3 border-t border-border/60 px-3 py-2 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> open
        </span>
        <span className="flex items-center gap-1">
          <Kbd>esc</Kbd> close
        </span>
        {searching && (
          <span className="ml-auto tabular-nums">
            {hits.length} result{hits.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </CommandDialog>
  );
}

interface PaletteCommand {
  group: "Create" | "Go to" | "Workspace";
  label: string;
  keywords: string;
  icon: React.ReactNode;
  shortcut?: string;
  /** The second key of a G chord, shown as a hint. */
  chord?: string;
  onSelect: () => void;
}

function PaletteAction({
  icon,
  label,
  shortcut,
  chord,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  chord?: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={label} onSelect={onSelect} className="gap-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      {chord && (
        <span className="flex items-center gap-1">
          <Kbd>G</Kbd>
          <Kbd>{chord.toUpperCase()}</Kbd>
        </span>
      )}
      {shortcut && <Kbd>{shortcut}</Kbd>}
      <ArrowRight className="size-3.5 opacity-0 transition-opacity duration-200 group-data-[selected=true]:opacity-40" />
    </CommandItem>
  );
}

function HitIcon({ hit }: { hit: SearchHit }) {
  if (hit.kind === "company") {
    return <CompanyAvatar name={hit.title} domain={hit.domain} size="sm" />;
  }
  if (hit.kind === "contact") {
    return <PersonAvatar name={hit.title} size="sm" />;
  }
  if (hit.kind === "application" || hit.kind === "job" || hit.kind === "interview") {
    return <CompanyAvatar name={hit.companyName ?? hit.title} domain={hit.domain} size="sm" />;
  }
  const Icon = hit.kind === "task" ? ListTodo : hit.kind === "note" ? FileText : Sparkles;
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-foreground/[0.05] text-muted-foreground">
      <Icon className="size-3.5" />
    </span>
  );
}
