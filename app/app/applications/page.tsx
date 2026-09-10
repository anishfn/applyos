"use client";

import * as React from "react";
import { FileText, LayoutGrid, Plus, Rows3, SquareKanban } from "@/components/ui/icons";
import { ApplicationFilterBar, useDebouncedValue } from "@/components/applications/application-filters";
import { ApplicationCardGrid } from "@/components/applications/application-card";
import { ApplicationTable } from "@/components/applications/application-table";
import { KanbanBoard } from "@/components/applications/kanban-board";
import { EmptyState } from "@/components/common/empty-state";
import { Segmented } from "@/components/common/form";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { useLocalStorageJSON, useLocalStorageState } from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { toApplicationViews } from "@/lib/derive";
import {
  applyFilters,
  countActiveFilters,
  DEFAULT_COLUMNS,
  emptyFilters,
  sortApplications,
  type ApplicationFilters,
  type ColumnKey,
  type SortState,
} from "@/lib/filters";

type ViewMode = "table" | "board" | "cards";

const VIEW_KEY = "applyos-applications-view";
const COLUMNS_KEY = "applyos-applications-columns";

const parseView = (raw: string): ViewMode | null =>
  raw === "table" || raw === "board" || raw === "cards" ? raw : null;

export default function ApplicationsPage() {
  const status = useStoreStatus();
  const { openQuickAdd } = useAppUI();

  const applications = useCollection("applications");
  const companies = useCollection("companies");
  const resumes = useCollection("resumes");

  // View preferences are UI state, not workspace data, they live in localStorage.
  const [view, changeView] = useLocalStorageState<ViewMode>(VIEW_KEY, "table", parseView);
  const [columns, changeColumns] = useLocalStorageJSON<ColumnKey[]>(COLUMNS_KEY, DEFAULT_COLUMNS);
  const [filters, setFilters] = React.useState<ApplicationFilters>(emptyFilters);
  const [sort, setSort] = React.useState<SortState>({ key: "updated", direction: "desc" });

  const debouncedQuery = useDebouncedValue(filters.query);
  const effectiveFilters = React.useMemo(
    () => ({ ...filters, query: debouncedQuery }),
    [filters, debouncedQuery],
  );

  const views = React.useMemo(
    () => toApplicationViews(applications, companies),
    [applications, companies],
  );

  const filtered = React.useMemo(
    () => sortApplications(applyFilters(views, effectiveFilters), sort),
    [views, effectiveFilters, sort],
  );

  const tagOptions = React.useMemo(
    () => [...new Set(applications.flatMap((application) => application.tags))].sort(),
    [applications],
  );

  if (status.status !== "ready") return <ListSkeleton rows={8} />;

  const hasAny = applications.length > 0;
  const filtersActive = countActiveFilters(filters) > 0 || filters.query.length > 0;

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col gap-3">
      <PageHeader
        title="Applications"
        description="Every job you have applied to, in one place."
        actions={
          <>
            <Segmented
              value={view}
              onChange={changeView}
              ariaLabel="View mode"
              options={[
                { value: "table", label: <Rows3 className="size-3.5" />, title: "Table" },
                { value: "board", label: <SquareKanban className="size-3.5" />, title: "Board" },
                { value: "cards", label: <LayoutGrid className="size-3.5" />, title: "Cards" },
              ]}
            />
            <Button variant="primary" size="sm" onClick={() => openQuickAdd("application")}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add application</span>
            </Button>
          </>
        }
      >
        {hasAny && (
          <ApplicationFilterBar
            filters={filters}
            onChange={setFilters}
            tagOptions={tagOptions}
            columns={view === "table" ? columns : undefined}
            onColumnsChange={view === "table" ? changeColumns : undefined}
            resultCount={filtered.length}
            totalCount={applications.length}
          />
        )}
      </PageHeader>

      {!hasAny ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={FileText}
            title="No applications yet"
            description="Start building your pipeline. Paste a job link and ApplyOS fills in the company, role and source for you."
            action={{ label: "Add application", onClick: () => openQuickAdd("application") }}
            secondaryAction={{ label: "Save a job instead", onClick: () => openQuickAdd("job") }}
          />
        </Surface>
      ) : filtered.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={FileText}
            title="Nothing matches those filters"
            description={
              filtersActive
                ? "Try widening the scope or clearing a filter."
                : "Every application here is closed. Switch the scope to see them."
            }
            action={{ label: "Clear filters", onClick: () => setFilters(emptyFilters()) }}
          />
        </Surface>
      ) : view === "table" ? (
        <ApplicationTable
          applications={filtered}
          columns={columns}
          sort={sort}
          onSortChange={setSort}
          resumes={resumes}
        />
      ) : view === "board" ? (
        <div className="group/board flex min-h-0 flex-1 flex-col">
          <KanbanBoard applications={filtered} />
        </div>
      ) : (
        <ApplicationCardGrid applications={filtered} />
      )}
    </div>
  );
}
