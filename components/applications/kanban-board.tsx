"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Plus } from "@/components/ui/icons";
import { toast } from "sonner";
import { ApplicationCard } from "@/components/applications/application-card";
import { ToneDot } from "@/components/common/badges";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { PIPELINE_STATUSES, STATUS_CONFIG } from "@/lib/constants";
import { setApplicationStatus } from "@/lib/data/actions";
import type { ApplicationView } from "@/lib/derive";
import { formatSalary, salaryMidpoint } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The pipeline board.
 *
 * Dropping a card calls the same `setApplicationStatus` the rest of the app
 * uses, so a drag writes an activity entry and applies the stage defaults
 * (setting `appliedAt`, scheduling the first follow-up) exactly like changing
 * the status from a menu would.
 */
export function KanbanBoard({
  applications,
  statuses = PIPELINE_STATUSES,
}: {
  applications: ApplicationView[];
  statuses?: ApplicationStatus[];
}) {
  const { openQuickAdd } = useAppUI();
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const columns = React.useMemo(() => {
    const map = new Map<ApplicationStatus, ApplicationView[]>();
    for (const status of statuses) map.set(status, []);
    for (const application of applications) {
      const bucket = map.get(application.status);
      if (bucket) bucket.push(application);
    }
    return map;
  }, [applications, statuses]);

  const dragging = draggingId
    ? (applications.find((application) => application.id === draggingId) ?? null)
    : null;

  const onDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const applicationId = String(event.active.id);
    const target = event.over?.id as ApplicationStatus | undefined;
    if (!target) return;
    const application = applications.find((item) => item.id === applicationId);
    if (!application || application.status === target) return;

    const previous = application.status;
    setApplicationStatus(applicationId, target);
    toast.success(`${application.position} → ${STATUS_CONFIG[target].label}`, {
      action: {
        label: "Undo",
        onClick: () => setApplicationStatus(applicationId, previous),
      },
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event: DragStartEvent) => setDraggingId(String(event.active.id))}
      onDragCancel={() => setDraggingId(null)}
      onDragEnd={onDragEnd}
    >
      <div className="no-scrollbar -mx-4 flex min-h-0 flex-1 gap-2.5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {statuses.map((status) => (
          <Column
            key={status}
            status={status}
            applications={columns.get(status) ?? []}
            draggingId={draggingId}
            onAdd={() => openQuickAdd("application")}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {dragging && (
          <div className="w-72 rotate-1 cursor-grabbing">
            <ApplicationCard application={dragging} dense showStatus={false} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  applications,
  draggingId,
  onAdd,
}: {
  status: ApplicationStatus;
  applications: ApplicationView[];
  draggingId: string | null;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = STATUS_CONFIG[status];

  const total = React.useMemo(
    () =>
      applications.reduce((sum, application) => sum + (salaryMidpoint(application.salary) ?? 0), 0),
    [applications],
  );

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[17.5rem] shrink-0 flex-col rounded-2xl bg-foreground/[0.02] edge",
        "transition-colors duration-200 ease-out",
        isOver && "bg-primary/[0.06] ring-primary/25",
      )}
    >
      <header className="flex shrink-0 items-center gap-2 px-3 py-2.5">
        <ToneDot tone={config.tone} />
        <h2 className="font-runde text-xs font-semibold tracking-tight">{config.label}</h2>
        <span className="rounded-full bg-foreground/[0.06] px-1.5 font-mono text-[10px] font-semibold text-muted-foreground tabular-nums">
          {applications.length}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onAdd}
          aria-label={`Add application to ${config.label}`}
          className="ml-auto opacity-0 transition-opacity duration-200 group-hover/board:opacity-100 focus-visible:opacity-100"
        >
          <Plus className="size-3.5" />
        </Button>
      </header>

      <div className="no-scrollbar flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {applications.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-foreground/[0.08] px-3 py-6 text-center">
            <p className="text-[11px] font-medium text-muted-foreground/70">
              {config.description ?? "Nothing here"}
            </p>
          </div>
        ) : (
          applications.map((application) => (
            <DraggableCard
              key={application.id}
              application={application}
              dragging={draggingId === application.id}
            />
          ))
        )}
      </div>

      {total > 0 && (
        <footer className="shrink-0 border-t border-foreground/[0.05] px-3 py-1.5">
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {formatSalary({ min: total, max: null, currency: "USD", period: "year" })?.replace(
              "from ",
              "",
            )}{" "}
            combined
          </span>
        </footer>
      )}
    </section>
  );
}

function DraggableCard({
  application,
  dragging,
}: {
  application: ApplicationView;
  dragging: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: application.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="cursor-grab touch-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:cursor-grabbing"
    >
      <ApplicationCard application={application} dense showStatus={false} dragging={dragging} />
    </div>
  );
}
