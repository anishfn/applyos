"use client";

import * as React from "react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ChevronsUpDown, ExternalLink, MoreHorizontal, Trash2 } from "@/components/ui/icons";
import { toast } from "sonner";
import { PriorityBadge, StatusBadge, TagChip } from "@/components/common/badges";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRIORITY_CONFIG, SOURCE_CONFIG, STATUS_CONFIG } from "@/lib/constants";
import {
  archiveApplication,
  deleteApplication,
  setApplicationStatus,
  updateApplication,
} from "@/lib/data/actions";
import { formatDueDate, formatRelative, formatSmartDate } from "@/lib/date";
import type { ApplicationView } from "@/lib/derive";
import { formatSalary } from "@/lib/format";
import { APPLICATION_COLUMNS, type ColumnKey, type SortKey, type SortState } from "@/lib/filters";
import type { ApplicationStatus, Priority, Resume } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Above this many rows the body is virtualised. */
const VIRTUALIZE_THRESHOLD = 60;
const ROW_HEIGHT = 44;

const COLUMN_WIDTH: Record<ColumnKey, string> = {
  company: "minmax(9rem,1.1fr)",
  position: "minmax(12rem,1.6fr)",
  status: "8.5rem",
  priority: "5rem",
  salary: "7rem",
  location: "minmax(7rem,0.9fr)",
  source: "7rem",
  resume: "9rem",
  applied: "6rem",
  nextAction: "minmax(9rem,1fr)",
  deadline: "6rem",
  updated: "6rem",
};

export function ApplicationTable({
  applications,
  columns,
  sort,
  onSortChange,
  resumes,
}: {
  applications: ApplicationView[];
  columns: ColumnKey[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  resumes: Resume[];
}) {
  const { deleteWithUndo } = useAppUI();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const visibleColumns = React.useMemo(
    () => APPLICATION_COLUMNS.filter((column) => columns.includes(column.key)),
    [columns],
  );

  const gridTemplate = React.useMemo(
    () => `2rem ${visibleColumns.map((column) => COLUMN_WIDTH[column.key]).join(" ")} 2.25rem`,
    [visibleColumns],
  );

  // Drop selections for rows that filtering has removed.
  React.useEffect(() => {
    setSelected((current) => {
      if (current.size === 0) return current;
      const ids = new Set(applications.map((application) => application.id));
      const next = new Set([...current].filter((id) => ids.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [applications]);

  const virtualize = applications.length > VIRTUALIZE_THRESHOLD;
  const virtualizer = useVirtualizer({
    count: applications.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    enabled: virtualize,
  });

  const toggleSort = (key: SortKey) => {
    onSortChange(
      sort.key === key
        ? { key, direction: sort.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "company" || key === "position" ? "asc" : "desc" },
    );
  };

  const allSelected = applications.length > 0 && selected.size === applications.length;

  const rows = virtualize ? virtualizer.getVirtualItems() : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden edge rounded-2xl bg-card">
      {/* Header. Selecting rows swaps it for the bulk bar, so the actions land
          in the same place every time instead of floating in over the list. */}
      {selected.size > 0 ? (
        <BulkBar
          ids={[...selected]}
          allSelected={allSelected}
          onToggleAll={(checked) =>
            setSelected(checked ? new Set(applications.map((a) => a.id)) : new Set())
          }
          onClear={() => setSelected(new Set())}
          onDelete={() => {
            const ids = [...selected];
            setSelected(new Set());
            const entries = ids.flatMap((id) => deleteApplication(id).entries);
            deleteWithUndo({ label: `${ids.length} applications deleted`, entries });
          }}
        />
      ) : (
      <div
        role="row"
        className="grid shrink-0 items-center gap-2 border-b border-foreground/[0.07] bg-foreground/[0.015] px-3 py-2"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <Checkbox
          checked={allSelected}
          indeterminate={selected.size > 0 && !allSelected}
          onChange={(checked) =>
            setSelected(checked ? new Set(applications.map((a) => a.id)) : new Set())
          }
          label="Select all applications"
        />
        {visibleColumns.map((column) => {
          const sortKey = "sortKey" in column ? column.sortKey : undefined;
          const active = sortKey && sort.key === sortKey;
          return (
            <div key={column.key} className="min-w-0">
              {sortKey ? (
                <button
                  type="button"
                  onClick={() => toggleSort(sortKey)}
                  className={cn(
                    "group inline-flex cursor-pointer items-center gap-1 rounded-md text-[11px] font-semibold",
                    "transition-colors duration-200",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {column.label}
                  {active ? (
                    sort.direction === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    )
                  ) : (
                    <ChevronsUpDown className="size-3 opacity-0 transition-opacity group-hover:opacity-50" />
                  )}
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {column.label}
                </span>
              )}
            </div>
          );
        })}
        <span />
      </div>
      )}

      {/* Body */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {virtualize ? (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {rows?.map((virtualRow) => (
              <div
                key={applications[virtualRow.index].id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <Row
                  application={applications[virtualRow.index]}
                  columns={visibleColumns}
                  gridTemplate={gridTemplate}
                  selected={selected.has(applications[virtualRow.index].id)}
                  onSelect={(checked) =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (checked) next.add(applications[virtualRow.index].id);
                      else next.delete(applications[virtualRow.index].id);
                      return next;
                    })
                  }
                  resumes={resumes}
                  onDelete={() => deleteWithUndo(deleteApplication(applications[virtualRow.index].id))}
                />
              </div>
            ))}
          </div>
        ) : (
          applications.map((application) => (
            <Row
              key={application.id}
              application={application}
              columns={visibleColumns}
              gridTemplate={gridTemplate}
              selected={selected.has(application.id)}
              onSelect={(checked) =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (checked) next.add(application.id);
                  else next.delete(application.id);
                  return next;
                })
              }
              resumes={resumes}
              onDelete={() => deleteWithUndo(deleteApplication(application.id))}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Row                                                                         */
/* -------------------------------------------------------------------------- */

type VisibleColumn = (typeof APPLICATION_COLUMNS)[number];

const Row = React.memo(function Row({
  application,
  columns,
  gridTemplate,
  selected,
  onSelect,
  resumes,
  onDelete,
}: {
  application: ApplicationView;
  columns: readonly VisibleColumn[];
  gridTemplate: string;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  resumes: Resume[];
  onDelete: () => void;
}) {
  const resume = resumes.find((item) => item.id === application.resumeId);

  return (
    <div
      className={cn(
        "group grid items-center gap-2 border-b border-foreground/[0.045] px-3",
        "transition-colors duration-150 ease-out",
        selected ? "bg-primary/[0.06]" : "hover:bg-foreground/[0.025]",
      )}
      style={{ gridTemplateColumns: gridTemplate, height: ROW_HEIGHT }}
    >
      <Checkbox
        checked={selected}
        onChange={onSelect}
        label={`Select ${application.position}`}
        className={cn(!selected && "opacity-0 group-hover:opacity-100 focus-within:opacity-100")}
      />

      {columns.map((column) => (
        <div key={column.key} className="min-w-0">
          {renderCell(column.key, application, resume)}
        </div>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Row actions"
            className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/app/applications/${application.id}`}>Open workspace</Link>
          </DropdownMenuItem>
          {application.jobUrl && (
            <DropdownMenuItem asChild>
              <a href={application.jobUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="size-3.5" />
                Open job posting
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Move to stage</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              {Object.values(STATUS_CONFIG).map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => {
                    const previous = application.status;
                    setApplicationStatus(application.id, option.value);
                    toast.success(`Moved to ${option.label}`, {
                      action: {
                        label: "Undo",
                        onClick: () => setApplicationStatus(application.id, previous),
                      },
                    });
                  }}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Set priority</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {Object.values(PRIORITY_CONFIG).map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => updateApplication(application.id, { priority: option.value })}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              archiveApplication(application.id, !application.archived);
              toast(application.archived ? "Restored from archive" : "Archived");
            }}
          >
            {application.archived ? "Restore" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

function renderCell(key: ColumnKey, application: ApplicationView, resume?: Resume) {
  switch (key) {
    case "company":
      return (
        <Link
          href={`/app/companies/${application.companyId}`}
          className="flex min-w-0 items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
        >
          <CompanyAvatar
            name={application.companyName}
            domain={application.company?.domain}
            size="xs"
          />
          <span className="truncate">{application.companyName}</span>
        </Link>
      );
    case "position":
      return (
        <Link href={`/app/applications/${application.id}`} className="block min-w-0">
          <span className="block truncate text-sm font-medium transition-colors group-hover:text-primary">
            {application.position}
          </span>
          {application.tags.length > 0 && (
            <span className="mt-0.5 flex gap-1">
              {application.tags.slice(0, 2).map((tag) => (
                <TagChip key={tag} label={tag} />
              ))}
            </span>
          )}
        </Link>
      );
    case "status":
      return <InlineStatus application={application} />;
    case "priority":
      return <InlinePriority application={application} />;
    case "salary":
      return (
        <span className="block truncate font-mono text-xs text-muted-foreground tabular-nums">
          {formatSalary(application.salary) ?? "-"}
        </span>
      );
    case "location":
      return (
        <span className="block truncate text-xs text-muted-foreground">
          {application.location ?? "-"}
        </span>
      );
    case "source":
      return (
        <span className="block truncate text-xs text-muted-foreground">
          {application.source ? SOURCE_CONFIG[application.source].label : "-"}
        </span>
      );
    case "resume":
      return (
        <span className="block truncate text-xs text-muted-foreground">
          {resume ? `${resume.name} v${resume.version}` : "-"}
        </span>
      );
    case "applied":
      return (
        <span className="block truncate font-mono text-xs text-muted-foreground tabular-nums">
          {application.appliedAt ? formatSmartDate(application.appliedAt) : "-"}
        </span>
      );
    case "nextAction":
      return application.nextAction ? (
        <span className="block min-w-0">
          <span className="block truncate text-xs font-medium">{application.nextAction}</span>
          {application.nextActionDate && (
            <span
              className={cn(
                "block font-mono text-[10px] tabular-nums",
                isOverdue(application.nextActionDate) ? "text-tone-rose" : "text-muted-foreground",
              )}
            >
              {formatDueDate(application.nextActionDate)}
            </span>
          )}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">-</span>
      );
    case "deadline":
      return (
        <span
          className={cn(
            "block truncate font-mono text-xs tabular-nums",
            application.deadline && isOverdue(application.deadline)
              ? "text-tone-rose"
              : "text-muted-foreground",
          )}
        >
          {application.deadline ? formatDueDate(application.deadline) : "-"}
        </span>
      );
    case "updated":
    default:
      return (
        <span className="block truncate font-mono text-xs text-muted-foreground tabular-nums">
          {formatRelative(application.updatedAt)}
        </span>
      );
  }
}

const isOverdue = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(year, (month ?? 1) - 1, day ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
};

/* -------------------------------------------------------------------------- */
/* Inline editors                                                              */
/* -------------------------------------------------------------------------- */

function InlineStatus({ application }: { application: ApplicationView }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="cursor-pointer rounded-full transition-opacity duration-200 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          aria-label={`Change status, currently ${STATUS_CONFIG[application.status].label}`}
        >
          <StatusBadge status={application.status} size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-48 overflow-y-auto">
        <DropdownMenuLabel className="text-[10px] font-medium">
          Move to stage
        </DropdownMenuLabel>
        {Object.values(STATUS_CONFIG).map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => {
              if (option.value === application.status) return;
              const previous = application.status;
              setApplicationStatus(application.id, option.value);
              toast.success(`Moved to ${option.label}`, {
                action: {
                  label: "Undo",
                  onClick: () => setApplicationStatus(application.id, previous),
                },
              });
            }}
          >
            <StatusBadge status={option.value} size="sm" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InlinePriority({ application }: { application: ApplicationView }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="cursor-pointer rounded-md px-1 py-1 transition-colors duration-200 hover:bg-foreground/[0.055] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          aria-label={`Change priority, currently ${PRIORITY_CONFIG[application.priority].label}`}
        >
          <PriorityBadge priority={application.priority} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {Object.values(PRIORITY_CONFIG).map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => updateApplication(application.id, { priority: option.value as Priority })}
          >
            <PriorityBadge priority={option.value} showLabel />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* -------------------------------------------------------------------------- */
/* Selection                                                                   */
/* -------------------------------------------------------------------------- */

function BulkBar({
  ids,
  allSelected,
  onToggleAll,
  onClear,
  onDelete,
}: {
  ids: string[];
  allSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-1 border-b border-foreground/[0.07] bg-primary/[0.06] py-1.5 pr-2 pl-3"
    >
      <Checkbox checked={allSelected} indeterminate={!allSelected} onChange={onToggleAll} label="Select all applications" />
      <span className="ml-2 text-xs font-semibold tabular-nums">{ids.length} selected</span>
      <span className="mx-1 h-4 w-px bg-foreground/12" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="xs">
            Stage
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-72 w-44 overflow-y-auto">
          {Object.values(STATUS_CONFIG).map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => {
                for (const id of ids) setApplicationStatus(id, option.value as ApplicationStatus);
                toast.success(`${ids.length} moved to ${option.label}`);
                onClear();
              }}
            >
              <StatusBadge status={option.value} size="sm" />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="xs">
            Priority
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-36">
          {Object.values(PRIORITY_CONFIG).map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => {
                for (const id of ids) updateApplication(id, { priority: option.value });
                toast.success(`${ids.length} updated`);
                onClear();
              }}
            >
              <PriorityBadge priority={option.value} showLabel />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="xs" onClick={onDelete} className="text-destructive">
        Delete
      </Button>
      <Button variant="ghost" size="xs" onClick={onClear} className="ml-auto">
        Clear selection
      </Button>
    </div>
  );
}
