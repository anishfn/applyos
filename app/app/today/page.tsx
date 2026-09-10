"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, Send, Sparkles, Sunrise, Video } from "@/components/ui/icons";
import { toast } from "sonner";
import { PriorityBadge, StatusBadge } from "@/components/common/badges";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { useAttentionActions } from "@/components/dashboard/needs-attention";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { getProfile, toggleTask, updateFollowUp } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import {
  daysFromToday,
  formatDueDate,
  formatLongDate,
  formatTime,
  isPastDate,
  isToday,
} from "@/lib/date";
import { buildAttentionItems, toApplicationViews } from "@/lib/derive";
import { cn } from "@/lib/utils";

/**
 * The morning page.
 *
 * Ordered strictly by when it needs you: interviews first (they have a clock),
 * then anything overdue, then today's work, then what you could get ahead on.
 */
export default function TodayPage() {
  const status = useStoreStatus();
  const { openQuickAdd } = useAppUI();
  const runAction = useAttentionActions();

  const applications = useCollection("applications");
  const companies = useCollection("companies");
  const interviews = useCollection("interviews");
  const tasks = useCollection("tasks");
  const followUps = useCollection("followUps");
  const contacts = useCollection("contacts");
  const profiles = useCollection("profiles");

  const profile = profiles[0] ?? getProfile();

  const today = React.useMemo(() => {
    const todaysInterviews = interviews
      .filter(
        (interview) =>
          isToday(interview.scheduledAt) &&
          interview.status !== "cancelled" &&
          interview.status !== "completed",
      )
      .sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1));

    const openTasks = tasks.filter((task) => task.status !== "completed");
    const overdueTasks = openTasks.filter((task) => task.dueDate && isPastDate(task.dueDate));
    const todaysTasks = openTasks.filter((task) => isToday(task.dueDate));

    const dueFollowUps = followUps.filter(
      (followUp) => followUp.status === "pending" && (daysFromToday(followUp.dueDate) ?? 1) <= 0,
    );

    // Includes deadlines that have already passed, a missed one still needs a decision.
    const deadlines = applications
      .filter(
        (application) =>
          application.deadline &&
          !application.archived &&
          (daysFromToday(application.deadline) ?? 99) <= 2,
      )
      .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));

    const toSubmit = applications.filter(
      (application) => !application.archived && application.status === "preparing",
    );

    const nextActions = applications.filter(
      (application) =>
        !application.archived &&
        application.nextAction &&
        (daysFromToday(application.nextActionDate) ?? 99) <= 0,
    );

    return {
      interviews: todaysInterviews,
      overdueTasks,
      todaysTasks,
      dueFollowUps,
      deadlines,
      toSubmit,
      nextActions,
    };
  }, [applications, interviews, tasks, followUps]);

  const attention = React.useMemo(
    () =>
      buildAttentionItems({
        applications,
        companies,
        interviews,
        tasks,
        followUps,
        contacts,
        profile,
      }),
    [applications, companies, interviews, tasks, followUps, contacts, profile],
  );

  const views = React.useMemo(
    () => toApplicationViews(applications, companies),
    [applications, companies],
  );

  if (status.status !== "ready") return <ListSkeleton rows={6} />;

  const totalItems =
    today.interviews.length +
    today.overdueTasks.length +
    today.todaysTasks.length +
    today.dueFollowUps.length +
    today.deadlines.length +
    today.nextActions.length;

  const critical = attention.filter((item) => item.severity === "critical").length;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Today"
        description={formatLongDate(new Date())}
        actions={
          <Button variant="primary" size="sm" onClick={() => openQuickAdd("application")}>
            Add application
          </Button>
        }
      />

      {totalItems === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Sunrise}
            title="Nothing is due today"
            description="No interviews, no overdue follow-ups, no tasks on the clock. The best use of a clear day is getting more applications out."
            action={{ label: "Add an application", onClick: () => openQuickAdd("application") }}
            secondaryAction={{ label: "Review saved jobs", href: "/app/jobs" }}
          />
        </Surface>
      ) : (
        <Surface
          className={cn(
            "flex flex-wrap items-center gap-3 p-3.5",
            critical > 0 && "ring-tone-rose/25",
          )}
        >
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
              critical > 0 ? "bg-tone-rose/12 text-tone-rose" : "bg-primary/15 text-primary-ink",
            )}
          >
            <Sparkles className="size-4" />
          </span>
          <p className="min-w-0 flex-1 text-sm font-medium">
            {today.interviews.length > 0 && (
              <>
                <span className="font-semibold">
                  {today.interviews.length} interview{today.interviews.length === 1 ? "" : "s"} today
                </span>
                {totalItems > today.interviews.length && " · "}
              </>
            )}
            {totalItems > today.interviews.length && (
              <span className="text-muted-foreground">
                {totalItems - today.interviews.length} other thing
                {totalItems - today.interviews.length === 1 ? "" : "s"} need you
              </span>
            )}
          </p>
        </Surface>
      )}

      {/* Interviews, they have a clock, so they come first. */}
      {today.interviews.length > 0 && (
        <Surface className="overflow-hidden">
          <SectionHeader
            title="Interviews today"
            count={today.interviews.length}
            className="border-b border-foreground/[0.06]"
          />
          <ul className="divide-y divide-foreground/[0.05]">
            {today.interviews.map((interview) => {
              const company = companies.find((item) => item.id === interview.companyId);
              return (
                <li key={interview.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="w-16 shrink-0 font-mono text-sm font-semibold tabular-nums">
                    {formatTime(interview.scheduledAt)}
                  </span>
                  <CompanyAvatar name={company?.name ?? "?"} domain={company?.domain} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {company?.name} · round {interview.round}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {interview.position}
                    </span>
                  </span>
                  {interview.meetingUrl && (
                    <Button
                      variant="primary"
                      size="xs"
                      href={interview.meetingUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <ExternalLink className="size-3" />
                      Join
                    </Button>
                  )}
                  <Button variant="outline" size="xs" href={`/app/interviews/${interview.id}`}>
                    Prep
                  </Button>
                </li>
              );
            })}
          </ul>
        </Surface>
      )}

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-7">
          {(today.overdueTasks.length > 0 || today.todaysTasks.length > 0) && (
            <Surface className="overflow-hidden">
              <SectionHeader
                title="Tasks"
                count={today.overdueTasks.length + today.todaysTasks.length}
                action={
                  <Button variant="ghost" size="xs" href="/app/tasks">
                    All tasks
                  </Button>
                }
                className="border-b border-foreground/[0.06]"
              />
              <ul className="divide-y divide-foreground/[0.05]">
                {[...today.overdueTasks, ...today.todaysTasks].map((task) => {
                  const overdue = task.dueDate ? isPastDate(task.dueDate) : false;
                  return (
                    <li key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          toggleTask(task.id);
                          toast.success("Done", {
                            action: { label: "Undo", onClick: () => toggleTask(task.id) },
                          });
                        }}
                        aria-label={`Complete ${task.title}`}
                        className="flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/25 transition-colors duration-200 hover:border-primary"
                      >
                        <Check className="size-3 opacity-0 transition-opacity hover:opacity-40" strokeWidth={3} />
                      </button>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
                      <PriorityBadge priority={task.priority} />
                      <span
                        className={cn(
                          "w-20 shrink-0 text-right font-mono text-[11px] tabular-nums",
                          overdue ? "text-tone-rose" : "text-muted-foreground",
                        )}
                      >
                        {task.dueDate ? formatDueDate(task.dueDate) : "-"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Surface>
          )}

          {today.dueFollowUps.length > 0 && (
            <Surface className="overflow-hidden">
              <SectionHeader
                title="Follow-ups to send"
                count={today.dueFollowUps.length}
                action={
                  <Button variant="ghost" size="xs" href="/app/follow-ups">
                    All follow-ups
                  </Button>
                }
                className="border-b border-foreground/[0.06]"
              />
              <ul className="divide-y divide-foreground/[0.05]">
                {today.dueFollowUps.map((followUp) => {
                  const application = applications.find(
                    (item) => item.id === followUp.applicationId,
                  );
                  const contact = contacts.find((item) => item.id === followUp.contactId);
                  const overdue = isPastDate(followUp.dueDate);
                  return (
                    <li key={followUp.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Send className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {followUp.subject ?? "Follow-up"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[contact?.name, application?.position].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-[11px] tabular-nums",
                          overdue ? "text-tone-rose" : "text-muted-foreground",
                        )}
                      >
                        {formatDueDate(followUp.dueDate)}
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          updateFollowUp(followUp.id, { status: "sent" });
                          toast.success("Marked as sent");
                        }}
                      >
                        Sent
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Surface>
          )}

          {today.nextActions.length > 0 && (
            <Surface className="overflow-hidden">
              <SectionHeader
                title="Next actions due"
                count={today.nextActions.length}
                className="border-b border-foreground/[0.06]"
              />
              <ul className="divide-y divide-foreground/[0.05]">
                {today.nextActions.map((application) => {
                  const view = views.find((item) => item.id === application.id);
                  return (
                    <li key={application.id} className="flex items-center gap-3 px-4 py-2.5">
                      <CompanyAvatar
                        name={view?.companyName ?? "?"}
                        domain={view?.company?.domain}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {application.nextAction}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {application.position} · {view?.companyName}
                        </span>
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          runAction(
                            { label: "Complete", kind: "complete_next_action", entityId: application.id },
                            `/app/applications/${application.id}`,
                          )
                        }
                      >
                        Complete
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Surface>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:col-span-5">
          {today.deadlines.length > 0 && (
            <Surface className="overflow-hidden">
              <SectionHeader
                title="Deadlines"
                count={today.deadlines.length}
                className="border-b border-foreground/[0.06]"
              />
              <ul className="divide-y divide-foreground/[0.05]">
                {today.deadlines.map((application) => {
                  const view = views.find((item) => item.id === application.id);
                  return (
                    <li key={application.id}>
                      <Link
                        href={`/app/applications/${application.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                      >
                        <CompanyAvatar
                          name={view?.companyName ?? "?"}
                          domain={view?.company?.domain}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {application.position}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {view?.companyName}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-tone-rose tabular-nums">
                          {formatDueDate(application.deadline)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Surface>
          )}

          <Surface className="overflow-hidden">
            <SectionHeader
              title="Ready to submit"
              count={today.toSubmit.length}
              action={
                <Button variant="ghost" size="xs" href="/app/pipeline">
                  Pipeline
                </Button>
              }
              className="border-b border-foreground/[0.06]"
            />
            {today.toSubmit.length === 0 ? (
              <EmptyState
                icon={ArrowRight}
                title="Nothing in progress"
                description="Applications you've started but not sent show up here."
                compact
              />
            ) : (
              <ul className="divide-y divide-foreground/[0.05]">
                {today.toSubmit.map((application) => {
                  const view = views.find((item) => item.id === application.id);
                  return (
                    <li key={application.id}>
                      <Link
                        href={`/app/applications/${application.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.025]"
                      >
                        <CompanyAvatar
                          name={view?.companyName ?? "?"}
                          domain={view?.company?.domain}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {application.position}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {view?.companyName}
                          </span>
                        </span>
                        <StatusBadge status={application.status} size="sm" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Surface>

          {today.interviews.length === 0 && (
            <Surface className="overflow-hidden">
              <SectionHeader title="Nothing on the calendar" className="border-b border-foreground/[0.06]" />
              <EmptyState
                icon={Video}
                title="No interviews today"
                description="A clear calendar is a good day to get applications out or reach out to a contact."
                compact
              />
            </Surface>
          )}
        </div>
      </div>
    </div>
  );
}
