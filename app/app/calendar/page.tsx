"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "@/components/ui/icons";
import { EmptyState } from "@/components/common/empty-state";
import { Segmented } from "@/components/common/form";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { EVENT_TYPE_CONFIG, TONE_DOT, TONE_SOFT } from "@/lib/constants";
import { getProfile } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import {
  addDays,
  eachDay,
  endOfWeek,
  formatDate,
  formatSmartDate,
  formatTime,
  isSameMonth,
  monthGrid,
  startOfMonth,
  startOfWeek,
  toDate,
  toDateOnly,
  todayDateOnly,
  WEEKDAY_LABELS,
} from "@/lib/date";
import type { EventType } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "month" | "week" | "day" | "agenda";

interface CalendarItem {
  id: string;
  title: string;
  subtitle: string;
  type: EventType;
  at: Date;
  allDay: boolean;
  href: string;
}

export default function CalendarPage() {
  const status = useStoreStatus();
  const { openQuickAdd } = useAppUI();

  const interviews = useCollection("interviews");
  const applications = useCollection("applications");
  const companies = useCollection("companies");
  const tasks = useCollection("tasks");
  const followUps = useCollection("followUps");
  const events = useCollection("events");
  const profiles = useCollection("profiles");

  const weekStartsOn = (profiles[0] ?? getProfile()).weekStartsOn;

  const [view, setView] = React.useState<View>("month");
  const [cursor, setCursor] = React.useState(() => new Date());

  /** Everything that belongs on a calendar, derived from the real records. */
  const items = React.useMemo<CalendarItem[]>(() => {
    const companyById = new Map(companies.map((company) => [company.id, company]));
    const applicationById = new Map(applications.map((application) => [application.id, application]));
    const result: CalendarItem[] = [];

    for (const interview of interviews) {
      const at = toDate(interview.scheduledAt);
      if (!at || interview.status === "cancelled") continue;
      result.push({
        id: `interview-${interview.id}`,
        title: `${companyById.get(interview.companyId)?.name ?? "Interview"} · R${interview.round}`,
        subtitle: interview.position,
        type: "interview",
        at,
        allDay: false,
        href: `/app/interviews/${interview.id}`,
      });
    }

    for (const application of applications) {
      if (!application.deadline || application.archived) continue;
      const at = toDate(application.deadline);
      if (!at) continue;
      result.push({
        id: `deadline-${application.id}`,
        title: `${application.position} closes`,
        subtitle: companyById.get(application.companyId)?.name ?? "",
        type: "deadline",
        at,
        allDay: true,
        href: `/app/applications/${application.id}`,
      });
    }

    for (const followUp of followUps) {
      if (followUp.status !== "pending") continue;
      const at = toDate(followUp.dueDate);
      if (!at) continue;
      const application = followUp.applicationId
        ? applicationById.get(followUp.applicationId)
        : null;
      result.push({
        id: `followup-${followUp.id}`,
        title: followUp.subject ?? "Follow-up",
        subtitle: application?.position ?? "",
        type: "follow_up",
        at,
        allDay: true,
        href: application ? `/app/applications/${application.id}` : "/app/follow-ups",
      });
    }

    for (const task of tasks) {
      if (task.status === "completed" || !task.dueDate) continue;
      const at = toDate(task.dueDate);
      if (!at) continue;
      result.push({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: "Task",
        type: "task",
        at,
        allDay: true,
        href: "/app/tasks",
      });
    }

    for (const event of events) {
      const at = toDate(event.startAt);
      if (!at) continue;
      result.push({
        id: `event-${event.id}`,
        title: event.title,
        subtitle: event.location ?? EVENT_TYPE_CONFIG[event.type].label,
        type: event.type,
        at,
        allDay: event.allDay,
        href: "/app/calendar",
      });
    }

    return result.sort((a, b) => a.at.getTime() - b.at.getTime());
  }, [interviews, applications, companies, tasks, followUps, events]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = toDateOnly(item.at);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const step = (direction: 1 | -1) => {
    setCursor((current) => {
      if (view === "month") return new Date(current.getFullYear(), current.getMonth() + direction, 1);
      if (view === "week") return addDays(current, 7 * direction);
      if (view === "day") return addDays(current, direction);
      return addDays(current, 14 * direction);
    });
  };

  if (status.status !== "ready") return <ListSkeleton rows={6} />;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Calendar"
        description="Interviews, deadlines, follow-ups and tasks in one place."
        actions={
          <>
            <Segmented
              value={view}
              onChange={setView}
              ariaLabel="Calendar view"
              options={[
                { value: "month", label: "Month" },
                { value: "week", label: "Week" },
                { value: "day", label: "Day" },
                { value: "agenda", label: "Agenda" },
              ]}
            />
            <Button variant="primary" size="sm" onClick={() => openQuickAdd("event")}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add event</span>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => step(-1)} aria-label="Previous">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => step(1)} aria-label="Next">
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
              Today
            </Button>
          </div>
          <h2 className="font-runde text-sm font-semibold tracking-tight">
            {view === "day"
              ? formatDate(cursor, "EEEE, MMMM d")
              : view === "week"
                ? `${formatDate(startOfWeek(cursor, weekStartsOn), "MMM d")} – ${formatDate(endOfWeek(cursor, weekStartsOn), "MMM d")}`
                : formatDate(cursor, "MMMM yyyy")}
          </h2>
          <Legend className="ml-auto hidden md:flex" />
        </div>
      </PageHeader>

      {view === "month" && (
        <MonthView
          cursor={cursor}
          byDay={byDay}
          weekStartsOn={weekStartsOn}
          onPickDay={(day) => {
            setCursor(day);
            setView("day");
          }}
          onCreate={(day) => openQuickAdd("event", { date: toDateOnly(day) })}
        />
      )}

      {view === "week" && (
        <WeekView cursor={cursor} byDay={byDay} weekStartsOn={weekStartsOn} />
      )}

      {view === "day" && <DayView cursor={cursor} byDay={byDay} />}

      {view === "agenda" && <AgendaView items={items} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Views                                                                       */
/* -------------------------------------------------------------------------- */

function MonthView({
  cursor,
  byDay,
  weekStartsOn,
  onPickDay,
  onCreate,
}: {
  cursor: Date;
  byDay: Map<string, CalendarItem[]>;
  weekStartsOn: 0 | 1;
  onPickDay: (day: Date) => void;
  onCreate: (day: Date) => void;
}) {
  const days = React.useMemo(() => monthGrid(cursor, weekStartsOn), [cursor, weekStartsOn]);
  const month = startOfMonth(cursor);

  return (
    <Surface className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-foreground/[0.06]">
        {WEEKDAY_LABELS(weekStartsOn).map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = toDateOnly(day);
          const dayItems = byDay.get(key) ?? [];
          const outside = !isSameMonth(day, month);
          const today = key === todayDateOnly();
          const weekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={key}
              className={cn(
                "group relative flex min-h-28 flex-col border-r border-b border-foreground/[0.05] p-1.5 [&:nth-child(7n)]:border-r-0",
                outside && "bg-foreground/[0.012]",
                weekend && !outside && "bg-foreground/[0.012]",
                today && "bg-primary/[0.045]",
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onPickDay(day)}
                  className={cn(
                    "flex size-6 cursor-pointer items-center justify-center rounded-full font-mono text-[11px] font-semibold tabular-nums transition-colors duration-200",
                    today
                      ? "bg-primary text-primary-foreground"
                      : outside
                        ? "text-muted-foreground/40 hover:bg-foreground/[0.05]"
                        : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                  )}
                >
                  {day.getDate()}
                </button>
                <button
                  type="button"
                  onClick={() => onCreate(day)}
                  aria-label={`Add event on ${formatSmartDate(day)}`}
                  className="cursor-pointer rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-70 hover:!opacity-100"
                >
                  <Plus className="size-3" />
                </button>
              </div>

              <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1">
                {dayItems.slice(0, 3).map((item) => {
                  const tone = EVENT_TYPE_CONFIG[item.type].tone;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={`${item.title} · ${item.subtitle}`}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md py-1 pr-1.5 pl-1 text-[10px] leading-none font-medium",
                        "transition-opacity duration-150 hover:opacity-80",
                        TONE_SOFT[tone],
                      )}
                    >
                      <span className={cn("h-3 w-0.5 shrink-0 rounded-full", TONE_DOT[tone])} />
                      {!item.allDay && (
                        <span className="shrink-0 font-mono tabular-nums opacity-70">
                          {formatTime(item.at).replace(":00", "").replace(" ", "")}
                        </span>
                      )}
                      <span className="min-w-0 truncate text-foreground/90">{item.title}</span>
                    </Link>
                  );
                })}
                {dayItems.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onPickDay(day)}
                    className="cursor-pointer px-1 text-left text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    +{dayItems.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function WeekView({
  cursor,
  byDay,
  weekStartsOn,
}: {
  cursor: Date;
  byDay: Map<string, CalendarItem[]>;
  weekStartsOn: 0 | 1;
}) {
  const days = eachDay(startOfWeek(cursor, weekStartsOn), endOfWeek(cursor, weekStartsOn));

  return (
    <Surface className="overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-7">
        {days.map((day) => {
          const key = toDateOnly(day);
          const dayItems = byDay.get(key) ?? [];
          const today = key === todayDateOnly();
          return (
            <div
              key={key}
              className="min-h-40 border-r border-b border-foreground/[0.05] last:border-r-0"
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 border-b border-foreground/[0.05] px-2 py-1.5",
                  today && "bg-primary/[0.06]",
                )}
              >
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {formatDate(day, "EEE")}
                </span>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold tabular-nums",
                    today && "text-primary",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-1.5">
                {dayItems.length === 0 ? (
                  <span className="px-1 py-2 text-[10px] text-muted-foreground/50">-</span>
                ) : (
                  dayItems.map((item) => <ItemChip key={item.id} item={item} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function DayView({ cursor, byDay }: { cursor: Date; byDay: Map<string, CalendarItem[]> }) {
  const dayItems = byDay.get(toDateOnly(cursor)) ?? [];
  const timed = dayItems.filter((item) => !item.allDay);
  const allDay = dayItems.filter((item) => item.allDay);

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <Surface className="overflow-hidden lg:col-span-8">
        <div className="border-b border-foreground/[0.06] px-4 py-2.5">
          <h3 className="font-runde text-sm font-semibold tracking-tight">
            {formatDate(cursor, "EEEE, MMMM d")}
          </h3>
        </div>
        {timed.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nothing scheduled" description="No timed events today." compact />
        ) : (
          <ul className="divide-y divide-foreground/[0.05]">
            {timed.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-foreground/[0.025]"
                >
                  <span className="w-16 shrink-0 font-mono text-sm font-semibold tabular-nums">
                    {formatTime(item.at)}
                  </span>
                  <span
                    className={cn(
                      "h-8 w-1 shrink-0 rounded-full",
                      TONE_DOT[EVENT_TYPE_CONFIG[item.type].tone],
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <Surface className="overflow-hidden lg:col-span-4">
        <div className="border-b border-foreground/[0.06] px-4 py-2.5">
          <h3 className="font-runde text-sm font-semibold tracking-tight">Due today</h3>
        </div>
        {allDay.length === 0 ? (
          <EmptyState title="Nothing due" compact />
        ) : (
          <ul className="divide-y divide-foreground/[0.05]">
            {allDay.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      TONE_DOT[EVENT_TYPE_CONFIG[item.type].tone],
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{item.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.subtitle || EVENT_TYPE_CONFIG[item.type].label}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}

function AgendaView({ items }: { items: CalendarItem[] }) {
  const upcoming = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return items.filter((item) => item.at.getTime() >= now.getTime()).slice(0, 60);
  }, [items]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of upcoming) {
      const key = toDateOnly(item.at);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [upcoming]);

  if (grouped.length === 0) {
    return (
      <Surface className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={CalendarDays}
          title="Nothing ahead"
          description="No interviews, deadlines or follow-ups scheduled."
        />
      </Surface>
    );
  }

  return (
    <Surface className="overflow-hidden">
      {grouped.map(([key, group]) => (
        <div key={key}>
          <div
            className={cn(
              "flex items-center gap-2 bg-foreground/[0.015] px-4 py-1.5",
              key === todayDateOnly() && "bg-primary/[0.06]",
            )}
          >
            <span className="text-[11px] font-semibold text-muted-foreground">
              {key === todayDateOnly() ? "Today" : formatDate(toDate(key), "EEEE, MMM d")}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {group.length}
            </span>
          </div>
          <ul className="divide-y divide-foreground/[0.05]">
            {group.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                >
                  <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {item.allDay ? "All day" : formatTime(item.at)}
                  </span>
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      TONE_DOT[EVENT_TYPE_CONFIG[item.type].tone],
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-foreground/[0.045] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {EVENT_TYPE_CONFIG[item.type].label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Surface>
  );
}

function ItemChip({ item }: { item: CalendarItem }) {
  return (
    <Link
      href={item.href}
      title={`${item.title} · ${item.subtitle}`}
      className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[10px] font-medium transition-colors duration-200 hover:bg-foreground/[0.06]"
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[EVENT_TYPE_CONFIG[item.type].tone])}
      />
      {!item.allDay && (
        <span className="shrink-0 font-mono text-muted-foreground tabular-nums">
          {formatTime(item.at).replace(":00", "")}
        </span>
      )}
      <span className="min-w-0 truncate">{item.title}</span>
    </Link>
  );
}

function Legend({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {(["interview", "deadline", "follow_up", "task", "networking"] as EventType[]).map((type) => (
        <span key={type} className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", TONE_DOT[EVENT_TYPE_CONFIG[type].tone])} />
          {EVENT_TYPE_CONFIG[type].label}
        </span>
      ))}
    </div>
  );
}
