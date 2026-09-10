"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Plus, Video } from "@/components/ui/icons";
import {
  InterviewStatusBadge,
  InterviewTypeBadge,
  ToneDot,
} from "@/components/common/badges";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { Segmented } from "@/components/common/form";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import {
  daysFromToday,
  formatDuration,
  formatSmartDate,
  formatTime,
  isToday,
  isTomorrow,
} from "@/lib/date";
import type { Interview } from "@/lib/types";
import { cn } from "@/lib/utils";

type Scope = "upcoming" | "past" | "all";

export default function InterviewsPage() {
  const status = useStoreStatus();
  const { openQuickAdd } = useAppUI();

  const interviews = useCollection("interviews");
  const companies = useCollection("companies");
  const contacts = useCollection("contacts");

  const [scope, setScope] = React.useState<Scope>("upcoming");

  const grouped = React.useMemo(() => {
    const isUpcoming = (interview: Interview) => {
      const days = daysFromToday(interview.scheduledAt);
      return (
        days !== null &&
        days >= 0 &&
        (interview.status === "scheduled" || interview.status === "rescheduled")
      );
    };

    const filtered = interviews.filter((interview) =>
      scope === "upcoming" ? isUpcoming(interview) : scope === "past" ? !isUpcoming(interview) : true,
    );

    const sorted = filtered.sort((a, b) =>
      scope === "past"
        ? a.scheduledAt < b.scheduledAt
          ? 1
          : -1
        : a.scheduledAt < b.scheduledAt
          ? -1
          : 1,
    );

    const buckets = new Map<string, Interview[]>();
    for (const interview of sorted) {
      const label = isToday(interview.scheduledAt)
        ? "Today"
        : isTomorrow(interview.scheduledAt)
          ? "Tomorrow"
          : formatSmartDate(interview.scheduledAt);
      const list = buckets.get(label) ?? [];
      list.push(interview);
      buckets.set(label, list);
    }
    return [...buckets.entries()];
  }, [interviews, scope]);

  if (status.status !== "ready") return <ListSkeleton rows={5} />;

  const total = interviews.length;
  const upcomingCount = interviews.filter((interview) => {
    const days = daysFromToday(interview.scheduledAt);
    return days !== null && days >= 0 && interview.status === "scheduled";
  }).length;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Interviews"
        description={
          upcomingCount > 0
            ? `${upcomingCount} coming up. Open one to build its prep workspace.`
            : "Schedule one and a prep workspace comes with it."
        }
        actions={
          <>
            <Segmented
              value={scope}
              onChange={setScope}
              ariaLabel="Interview scope"
              options={[
                { value: "upcoming", label: "Upcoming" },
                { value: "past", label: "Past" },
                { value: "all", label: "All" },
              ]}
            />
            <Button variant="primary" size="sm" onClick={() => openQuickAdd("interview")}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Schedule</span>
            </Button>
          </>
        }
      />

      {total === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Video}
            title="No interviews yet"
            description="When one lands, add it here and you get company research, likely questions and your best stories in one place."
            action={{ label: "Schedule an interview", onClick: () => openQuickAdd("interview") }}
          />
        </Surface>
      ) : grouped.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Video}
            title={scope === "upcoming" ? "Nothing scheduled" : "Nothing here"}
            description={
              scope === "upcoming"
                ? "No interviews on the calendar. Time to get more applications out."
                : "Switch the scope to see the rest."
            }
            action={{ label: "Schedule an interview", onClick: () => openQuickAdd("interview") }}
          />
        </Surface>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          {grouped.map(([label, group]) => (
            <div key={label}>
              <p className="mb-1.5 px-1 text-[11px] font-semibold text-muted-foreground">
                {label}
              </p>
              <div className="flex flex-col gap-2">
                {group.map((interview) => {
                  const company = companies.find((item) => item.id === interview.companyId);
                  const interviewers = [
                    ...interview.interviewerContactIds
                      .map((id) => contacts.find((contact) => contact.id === id)?.name)
                      .filter(Boolean),
                    ...interview.interviewerNames,
                  ] as string[];
                  const soon = isToday(interview.scheduledAt) || isTomorrow(interview.scheduledAt);

                  return (
                    <Surface
                      key={interview.id}
                      interactive
                      className={cn("relative p-3.5", soon && interview.status === "scheduled" && "ring-primary/25")}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <CompanyAvatar name={company?.name ?? "?"} domain={company?.domain} size="lg" />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/app/interviews/${interview.id}`}
                              className="font-runde text-sm font-semibold tracking-tight"
                            >
                              {company?.name ?? "Unknown company"}
                              <span className="absolute inset-0" aria-hidden />
                            </Link>
                            <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                              Round {interview.round}
                            </span>
                          </div>
                          <p className="truncate text-xs font-medium text-muted-foreground">
                            {interview.position}
                            {interviewers.length > 0 && ` · with ${interviewers.join(", ")}`}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <InterviewTypeBadge type={interview.type} size="sm" />
                          <InterviewStatusBadge status={interview.status} size="sm" />
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="font-mono text-xs font-semibold tabular-nums">
                            {formatTime(interview.scheduledAt)}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                            {formatDuration(interview.durationMinutes)}
                          </span>
                        </div>

                        <div className="relative z-10 flex shrink-0 items-center gap-1.5">
                          {interview.meetingUrl && soon && (
                            <Button
                              variant="secondary"
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
                        </div>
                      </div>

                      {interview.feedback && (
                        <p className="mt-2.5 flex items-start gap-2 border-t border-foreground/[0.06] pt-2.5 text-xs leading-5 font-medium text-muted-foreground">
                          <ToneDot tone="teal" className="mt-1.5" />
                          {interview.feedback}
                        </p>
                      )}
                    </Surface>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
