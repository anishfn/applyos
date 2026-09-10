"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ListTodo, Plus, Search, Trash2 } from "@/components/ui/icons";
import { toast } from "sonner";
import { PriorityBadge, TaskStatusBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/empty-state";
import { DateInput, OptionSelect, Segmented } from "@/components/common/form";
import { InlineText } from "@/components/common/inline-edit";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { PRIORITY_CONFIG, PRIORITY_RANK } from "@/lib/constants";
import { createTask, deleteTask, toggleTask, updateTask } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { daysFromToday, formatDueDate, todayDateOnly } from "@/lib/date";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "today" | "upcoming" | "overdue" | "all" | "completed";

export default function TasksPage() {
  const status = useStoreStatus();
  const { deleteWithUndo } = useAppUI();

  const tasks = useCollection("tasks");
  const applications = useCollection("applications");
  const companies = useCollection("companies");

  const [view, setView] = React.useState<View>("today");
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState("");

  const counts = React.useMemo(() => {
    const open = tasks.filter((task) => task.status !== "completed");
    return {
      today: open.filter((task) => (daysFromToday(task.dueDate) ?? 1) <= 0).length,
      upcoming: open.filter((task) => (daysFromToday(task.dueDate) ?? -1) > 0).length,
      overdue: open.filter((task) => (daysFromToday(task.dueDate) ?? 1) < 0).length,
      all: open.length,
      completed: tasks.length - open.length,
    };
  }, [tasks]);

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (task: Task) => {
      if (!needle) return true;
      return `${task.title} ${task.description ?? ""}`.toLowerCase().includes(needle);
    };

    const open = tasks.filter((task) => task.status !== "completed");
    let list: Task[];
    switch (view) {
      case "today":
        list = open.filter((task) => (daysFromToday(task.dueDate) ?? 1) <= 0);
        break;
      case "upcoming":
        list = open.filter((task) => (daysFromToday(task.dueDate) ?? -1) > 0);
        break;
      case "overdue":
        list = open.filter((task) => (daysFromToday(task.dueDate) ?? 1) < 0);
        break;
      case "completed":
        list = tasks.filter((task) => task.status === "completed");
        break;
      case "all":
      default:
        list = open;
    }

    return list.filter(matches).sort((a, b) => {
      if (view === "completed") return (a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1;
      const left = daysFromToday(a.dueDate);
      const right = daysFromToday(b.dueDate);
      if (left !== right) {
        if (left === null) return 1;
        if (right === null) return -1;
        return left - right;
      }
      return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    });
  }, [tasks, view, query]);

  if (status.status !== "ready") return <ListSkeleton rows={7} />;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Tasks"
        description={
          counts.overdue > 0
            ? `${counts.overdue} overdue. Clear those first.`
            : "Everything you owe yourself, in one list."
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={view}
            onChange={setView}
            ariaLabel="Task view"
            options={[
              { value: "today", label: `Today${counts.today ? ` · ${counts.today}` : ""}` },
              { value: "upcoming", label: "Upcoming" },
              { value: "overdue", label: `Overdue${counts.overdue ? ` · ${counts.overdue}` : ""}` },
              { value: "all", label: "All" },
              { value: "completed", label: "Done" },
            ]}
          />
          <div className="relative min-w-40 flex-1 sm:max-w-56">
            <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              placeholder="Filter tasks…"
              onChange={(event) => setQuery(event.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      </PageHeader>

      {/* Quick add, the fastest path to a new task. */}
      <Surface className="p-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const title = draft.trim();
            if (!title) return;
            createTask({
              title,
              dueDate: view === "upcoming" ? null : todayDateOnly(),
            });
            setDraft("");
          }}
          className="flex items-center gap-2"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-foreground/25 text-muted-foreground">
            <Plus className="size-3" />
          </span>
          <Input
            value={draft}
            placeholder="Add a task and press Enter…"
            onChange={(event) => setDraft(event.target.value)}
            className="h-8 border-transparent bg-transparent text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          {draft && (
            <Button type="submit" variant="primary" size="xs">
              Add
            </Button>
          )}
        </form>
      </Surface>

      {visible.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={ListTodo}
            title={emptyTitle(view, counts.all)}
            description={emptyDescription(view)}
            action={
              view === "completed" || counts.all > 0
                ? undefined
                : { label: "Add a task", onClick: () => document.querySelector<HTMLInputElement>("input[placeholder^='Add a task']")?.focus() }
            }
          />
        </Surface>
      ) : (
        <Surface className="overflow-hidden">
          <ul className="divide-y divide-foreground/[0.05]">
            {visible.map((task) => {
              const application =
                task.relatedType === "application"
                  ? applications.find((item) => item.id === task.relatedId)
                  : null;
              const company = application
                ? companies.find((item) => item.id === application.companyId)
                : null;
              const overdue = (daysFromToday(task.dueDate) ?? 1) < 0 && task.status !== "completed";

              return (
                <li key={task.id} className="group flex items-center gap-3 px-3 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.02]">
                  <button
                    type="button"
                    onClick={() => {
                      toggleTask(task.id);
                      if (task.status !== "completed") {
                        toast.success("Done", {
                          action: { label: "Undo", onClick: () => toggleTask(task.id) },
                        });
                      }
                    }}
                    aria-label={`Toggle ${task.title}`}
                    className={cn(
                      "flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-200",
                      task.status === "completed"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-foreground/25 hover:border-primary",
                    )}
                  >
                    {task.status === "completed" && <Check className="size-3" strokeWidth={3} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <InlineText
                      value={task.title}
                      onCommit={(title) => title && updateTask(task.id, { title })}
                      ariaLabel="task title"
                      className={cn("-ml-1.5", task.status === "completed" && "text-muted-foreground line-through")}
                    />
                    {application && (
                      <Link
                        href={`/app/applications/${application.id}`}
                        className="ml-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {application.position} · {company?.name}
                      </Link>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {task.status !== "completed" && (
                      <OptionSelect
                        size="sm"
                        value={task.priority}
                        onChange={(priority) => priority && updateTask(task.id, { priority })}
                        options={PRIORITY_CONFIG}
                        className="hidden h-7 w-[7.75rem] text-xs sm:flex"
                      />
                    )}
                    <PriorityBadge priority={task.priority} className="sm:hidden" />
                    <DateInput
                      value={task.dueDate}
                      onChange={(dueDate) => updateTask(task.id, { dueDate })}
                      display="MMM d"
                      placeholder="No date"
                      className={cn("h-7 w-[7.5rem] text-xs", overdue && "border-tone-rose/40 text-tone-rose")}
                      ariaLabel="Due date"
                    />
                    <span
                      className={cn(
                        "hidden w-20 shrink-0 text-right text-[11px] font-medium whitespace-nowrap md:block",
                        overdue ? "text-tone-rose" : "text-muted-foreground",
                      )}
                    >
                      {task.dueDate ? formatDueDate(task.dueDate) : ""}
                    </span>
                    {task.status === "completed" && <TaskStatusBadge status={task.status} size="sm" />}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete ${task.title}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => deleteWithUndo(deleteTask(task.id))}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Surface>
      )}
    </div>
  );
}

const emptyTitle = (view: View, openCount: number) => {
  if (view === "completed") return "Nothing completed yet";
  if (view === "overdue") return "Nothing overdue";
  if (view === "today") return openCount > 0 ? "Nothing due today" : "No tasks yet";
  if (view === "upcoming") return "Nothing scheduled";
  return "No tasks yet";
};

const emptyDescription = (view: View) => {
  switch (view) {
    case "completed":
      return "Finished tasks land here so you can see what you actually got done.";
    case "overdue":
      return "You're on top of everything. Rare and worth noticing.";
    case "today":
      return "Add the one thing that would move your search forward today.";
    case "upcoming":
      return "Give a task a future date and it'll show up here.";
    default:
      return "Tasks can stand alone or hang off an application, interview or contact.";
  }
};
