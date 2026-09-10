"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FileText,
  Lightbulb,
  Send,
  Video,
} from "@/components/ui/icons";
import { PriorityBadge, StatusBadge } from "@/components/common/badges";
import { Funnel } from "@/components/common/charts";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { ACTIVITY_CONFIG, FUNNEL_STATUSES, TONE_DOT } from "@/lib/constants";
import { computeFunnel, type Insight } from "@/lib/analytics";
import {
  formatDueDate,
  formatRelative,
  formatSmartDate,
  formatTime,
  isToday,
  isTomorrow,
} from "@/lib/date";
import type { ApplicationView, UpcomingItem } from "@/lib/derive";
import type { Activity, Application } from "@/lib/types";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Upcoming                                                                    */
/* -------------------------------------------------------------------------- */

const UPCOMING_ICON = {
  interview: Video,
  deadline: CalendarClock,
  follow_up: Send,
  task: CheckCircle2,
} as const;

const UPCOMING_TONE = {
  interview: "violet",
  deadline: "rose",
  follow_up: "cyan",
  task: "blue",
} as const;

export function UpcomingPanel({
  items,
  className,
  limit = 7,
}: {
  items: UpcomingItem[];
  className?: string;
  limit?: number;
}) {
  const grouped = React.useMemo(() => {
    const buckets = new Map<string, UpcomingItem[]>();
    for (const item of items.slice(0, limit)) {
      const label = isToday(item.at)
        ? "Today"
        : isTomorrow(item.at)
          ? "Tomorrow"
          : formatSmartDate(item.at);
      const list = buckets.get(label) ?? [];
      list.push(item);
      buckets.set(label, list);
    }
    return [...buckets.entries()];
  }, [items, limit]);

  return (
    <Surface className={cn("flex flex-col overflow-hidden", className)}>
      <SectionHeader
        title="Upcoming"
        count={items.length}
        action={
          <Button variant="ghost" size="xs" href="/app/calendar">
            Calendar
          </Button>
        }
        className="border-b border-foreground/[0.06]"
      />
      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing booked"
          description="No interviews, deadlines or follow-ups in the next two weeks."
          compact
        />
      ) : (
        <div className="flex flex-col">
          {grouped.map(([label, group]) => (
            <div key={label}>
              <p className="bg-foreground/[0.015] px-4 py-1 text-[11px] font-semibold text-muted-foreground">
                {label}
              </p>
              <ul className="divide-y divide-foreground/[0.05]">
                {group.map((item) => {
                  const Icon = UPCOMING_ICON[item.kind];
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-2 transition-colors duration-200 hover:bg-foreground/[0.025]"
                      >
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            TONE_DOT[UPCOMING_TONE[item.kind]],
                          )}
                        />
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{item.title}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {item.subtitle}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                          {item.allDay ? formatDueDate(item.at) : formatTime(item.at)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}

/* -------------------------------------------------------------------------- */
/* Recent applications                                                         */
/* -------------------------------------------------------------------------- */

export function RecentApplications({
  applications,
  className,
  limit = 7,
}: {
  applications: ApplicationView[];
  className?: string;
  limit?: number;
}) {
  const recent = React.useMemo(
    () =>
      [...applications]
        .filter((application) => !application.archived)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .slice(0, limit),
    [applications, limit],
  );

  return (
    <Surface className={cn("flex flex-col overflow-hidden", className)}>
      <SectionHeader
        title="Latest on your applications"
        action={
          <Button variant="ghost" size="xs" href="/app/applications">
            All applications
          </Button>
        }
        className="border-b border-foreground/[0.06]"
      />
      {recent.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nothing here yet"
          description="Paste a job link and the rest fills itself in."
          compact
        />
      ) : (
        <ul className="divide-y divide-foreground/[0.05]">
          {recent.map((application) => (
            <li key={application.id}>
              <Link
                href={`/app/applications/${application.id}`}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
              >
                <CompanyAvatar
                  name={application.companyName}
                  domain={application.company?.domain}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{application.position}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {application.companyName}
                    {application.nextAction && (
                      <>
                        <span className="mx-1 opacity-40">·</span>
                        <span className="text-foreground/60">{application.nextAction}</span>
                      </>
                    )}
                  </span>
                </span>
                <PriorityBadge priority={application.priority} className="hidden sm:flex" />
                <StatusBadge status={application.status} size="sm" className="hidden sm:inline-flex" />
                <span className="hidden w-16 shrink-0 text-right font-mono text-[11px] text-muted-foreground tabular-nums md:block">
                  {formatRelative(application.updatedAt)}
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-60" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

/* -------------------------------------------------------------------------- */
/* Funnel                                                                      */
/* -------------------------------------------------------------------------- */

export function FunnelPanel({
  applications,
  activities,
  className,
}: {
  applications: Application[];
  activities: Activity[];
  className?: string;
}) {
  const stages = React.useMemo(
    () =>
      computeFunnel(applications, FUNNEL_STATUSES, activities).map((point) => ({
        label: point.label,
        value: point.count,
      })),
    [applications, activities],
  );
  const hasData = stages.some((stage) => stage.value > 0);

  return (
    <Surface className={cn("flex flex-col overflow-hidden", className)}>
      <SectionHeader
        title="Pipeline funnel"
        action={
          <Button variant="ghost" size="xs" href="/app/pipeline">
            Open board
          </Button>
        }
        className="border-b border-foreground/[0.06]"
      />
      {hasData ? (
        <div className="p-3">
          <Funnel stages={stages} />
          <p className="mt-2 px-2 text-[11px] font-medium text-muted-foreground">
            Counts are cumulative, so each stage includes everything that made it further.
          </p>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nothing in the funnel"
          description="Add your first application to see how far things travel."
          compact
        />
      )}
    </Surface>
  );
}

/* -------------------------------------------------------------------------- */
/* Activity timeline                                                           */
/* -------------------------------------------------------------------------- */

export function ActivityPanel({
  activities,
  className,
  limit = 9,
  title = "Recent activity",
}: {
  activities: Activity[];
  className?: string;
  limit?: number;
  title?: string;
}) {
  const recent = React.useMemo(
    () =>
      [...activities].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)).slice(0, limit),
    [activities, limit],
  );

  return (
    <Surface className={cn("flex flex-col overflow-hidden", className)}>
      <SectionHeader title={title} className="border-b border-foreground/[0.06]" />
      {recent.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No activity yet"
          description="Every status change, interview and follow-up shows up here."
          compact
        />
      ) : (
        <ol className="relative px-4 py-3">
          <span
            aria-hidden
            className="absolute top-5 bottom-5 left-[1.4rem] w-px bg-foreground/[0.08]"
          />
          {recent.map((activity) => {
            const config = ACTIVITY_CONFIG[activity.type];
            return (
              <li key={activity.id} className="relative flex gap-3 py-1.5">
                <span
                  className={cn(
                    "z-10 mt-1 size-2 shrink-0 rounded-full ring-4 ring-card",
                    TONE_DOT[config.tone],
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{activity.title}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {config.label} · {formatRelative(activity.occurredAt)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Surface>
  );
}

/* -------------------------------------------------------------------------- */
/* Insights                                                                    */
/* -------------------------------------------------------------------------- */

export function InsightsPanel({
  insights,
  className,
  limit = 5,
}: {
  insights: Insight[];
  className?: string;
  limit?: number;
}) {
  const shown = insights.slice(0, limit);

  return (
    <Surface className={cn("flex flex-col overflow-hidden", className)}>
      <SectionHeader
        title="What the data says"
        action={
          <Button variant="ghost" size="xs" href="/app/analytics">
            Analytics
          </Button>
        }
        className="border-b border-foreground/[0.06]"
      />
      {shown.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Not enough data yet"
          description="Once you've submitted a handful of applications, patterns start showing up here."
          compact
        />
      ) : (
        <ul className="divide-y divide-foreground/[0.05]">
          {shown.map((insight) => {
            const body = (
              <>
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    insight.tone === "good" && "bg-primary",
                    insight.tone === "warning" && "bg-tone-amber",
                    insight.tone === "neutral" && "bg-tone-blue",
                  )}
                />
                <span className="min-w-0 flex-1 text-xs leading-5 font-medium text-foreground/85">
                  {insight.text}
                </span>
                {insight.href && (
                  <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-60" />
                )}
              </>
            );
            return (
              <li key={insight.id}>
                {insight.href ? (
                  <Link
                    href={insight.href}
                    className="group flex items-start gap-2.5 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-2.5 px-4 py-2.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Surface>
  );
}
