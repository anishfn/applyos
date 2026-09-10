"use client";

import * as React from "react";
import { Plus, SquareKanban } from "@/components/ui/icons";
import { ApplicationFilterBar, useDebouncedValue } from "@/components/applications/application-filters";
import { KanbanBoard } from "@/components/applications/kanban-board";
import { EmptyState } from "@/components/common/empty-state";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { toApplicationViews } from "@/lib/derive";
import { applyFilters, emptyFilters, type ApplicationFilters } from "@/lib/filters";

export default function PipelinePage() {
  const status = useStoreStatus();
  const { openQuickAdd } = useAppUI();
  const applications = useCollection("applications");
  const companies = useCollection("companies");

  const [filters, setFilters] = React.useState<ApplicationFilters>(() => ({
    ...emptyFilters(),
    scope: "all",
  }));
  const debouncedQuery = useDebouncedValue(filters.query);

  const views = React.useMemo(
    () => toApplicationViews(applications, companies),
    [applications, companies],
  );

  const filtered = React.useMemo(
    () => applyFilters(views, { ...filters, query: debouncedQuery }),
    [views, filters, debouncedQuery],
  );

  const tagOptions = React.useMemo(
    () => [...new Set(applications.flatMap((application) => application.tags))].sort(),
    [applications],
  );

  if (status.status !== "ready") return <ListSkeleton rows={6} />;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-3 md:h-[calc(100dvh-2.5rem)]">
      <PageHeader
        title="Pipeline"
        description="Drag a card to move it along. Everything else updates itself."
        actions={
          <Button variant="primary" size="sm" onClick={() => openQuickAdd("application")}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add application</span>
          </Button>
        }
      >
        {applications.length > 0 && (
          <ApplicationFilterBar
            filters={filters}
            onChange={setFilters}
            tagOptions={tagOptions}
            resultCount={filtered.length}
            totalCount={applications.length}
          />
        )}
      </PageHeader>

      {applications.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={SquareKanban}
            title="Your board is empty"
            description="Add an application and it lands in the first column. Drag it across as things progress."
            action={{ label: "Add application", onClick: () => openQuickAdd("application") }}
          />
        </Surface>
      ) : (
        <div className="group/board flex min-h-0 flex-1 flex-col">
          <KanbanBoard applications={filtered} />
        </div>
      )}
    </div>
  );
}
