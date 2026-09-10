"use client";

import * as React from "react";
import { Check, Plus, Target, Trash2 } from "@/components/ui/icons";
import { ProgressBar, ProgressRing } from "@/components/common/charts";
import { EmptyState } from "@/components/common/empty-state";
import { InlineText } from "@/components/common/inline-edit";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { NumberInput } from "@/components/common/form";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { GOAL_PERIOD_CONFIG, GOAL_TYPE_CONFIG, MANUAL_GOAL_TYPES, STATUS_RANK } from "@/lib/constants";
import { deleteGoal, getProfile, updateGoal } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import {
  endOfWeek,
  startOfMonth,
  startOfWeek,
  toDate,
} from "@/lib/date";
import { compactNumber } from "@/lib/format";
import type { Goal, GoalPeriod } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function GoalsPage() {
  const status = useStoreStatus();
  const { openQuickAdd, deleteWithUndo } = useAppUI();

  const goals = useCollection("goals");
  const applications = useCollection("applications");
  const interviews = useCollection("interviews");
  const contacts = useCollection("contacts");
  const followUps = useCollection("followUps");
  const profiles = useCollection("profiles");

  const profile = profiles[0] ?? getProfile();

  /** Progress is measured from real records, never entered by hand unless the goal type says so. */
  const progressFor = React.useCallback(
    (goal: Goal): number => {
      if (MANUAL_GOAL_TYPES.includes(goal.type)) return goal.manualProgress ?? 0;

      const [start, end] = windowFor(goal.period, profile.weekStartsOn);
      const inWindow = (value: string | null | undefined) => {
        const date = toDate(value);
        if (!date) return false;
        return date >= start && date <= end;
      };

      switch (goal.type) {
        case "applications":
          return applications.filter(
            (application) =>
              !application.archived &&
              STATUS_RANK[application.status] !== 0 &&
              inWindow(application.appliedAt ?? application.createdAt),
          ).length;
        case "interviews":
          return interviews.filter((interview) => inWindow(interview.scheduledAt)).length;
        case "contacts":
          return contacts.filter((contact) => inWindow(contact.createdAt)).length;
        case "follow_ups":
          return followUps.filter(
            (followUp) => followUp.status !== "pending" && inWindow(followUp.sentAt ?? followUp.dueDate),
          ).length;
        case "target_companies":
          return applications.filter(
            (application) =>
              profile.fit.preferredCompanyIds.includes(application.companyId) &&
              STATUS_RANK[application.status] !== 0,
          ).length;
        default:
          return 0;
      }
    },
    [applications, interviews, contacts, followUps, profile],
  );

  if (status.status !== "ready") return <ListSkeleton rows={4} />;

  const active = goals.filter((goal) => goal.active);
  const hit = active.filter((goal) => progressFor(goal) >= goal.target).length;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Goals"
        description={
          active.length === 0
            ? "Set the pace you want to keep, then let the data tell you if you're keeping it."
            : `${hit} of ${active.length} on track right now.`
        }
        actions={
          <Button variant="primary" size="sm" onClick={() => openQuickAdd("goal")}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Set a goal</span>
          </Button>
        }
      />

      {goals.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Twelve applications a week, six interviews a month, three new contacts. Pick numbers you can actually hit and ApplyOS measures them from your real data."
            action={{ label: "Set your first goal", onClick: () => openQuickAdd("goal") }}
          />
        </Surface>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const config = GOAL_TYPE_CONFIG[goal.type];
            const current = progressFor(goal);
            const ratio = goal.target > 0 ? current / goal.target : 0;
            const done = ratio >= 1;
            const manual = MANUAL_GOAL_TYPES.includes(goal.type);
            const money = goal.unit === "USD" || goal.type === "target_salary";

            return (
              <Surface key={goal.id} className={cn("p-4", !goal.active && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <ProgressRing
                    value={ratio}
                    size={48}
                    strokeWidth={4}
                    tone={done ? "var(--primary)" : "var(--tone-blue)"}
                  >
                    {done ? (
                      <Check className="size-4 text-primary" strokeWidth={3} />
                    ) : (
                      <span className="font-mono text-[10px] font-semibold tabular-nums">
                        {Math.round(ratio * 100)}%
                      </span>
                    )}
                  </ProgressRing>

                  <div className="min-w-0 flex-1">
                    <InlineText
                      value={goal.label || config.label}
                      onCommit={(label) => label && updateGoal(goal.id, { label })}
                      ariaLabel="goal label"
                      className="-ml-1.5 font-runde"
                    />
                    <p className="px-1.5 text-[11px] font-medium text-muted-foreground">
                      {GOAL_PERIOD_CONFIG[goal.period].label} · {config.description}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Delete goal"
                    onClick={() => deleteWithUndo(deleteGoal(goal.id))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  {manual ? (
                    <NumberInput
                      value={goal.manualProgress ?? 0}
                      onChange={(next) => updateGoal(goal.id, { manualProgress: next ?? 0 })}
                      className="h-8 w-28"
                      id={`goal-progress-${goal.id}`}
                    />
                  ) : (
                    <span className="font-runde text-2xl leading-none font-semibold tabular-nums">
                      {money ? compactNumber(current) : current}
                    </span>
                  )}
                  <span className="font-runde text-sm font-semibold text-muted-foreground tabular-nums">
                    / {money ? compactNumber(goal.target) : goal.target}
                  </span>
                  {done && (
                    <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary-ink">
                      Hit
                    </span>
                  )}
                </div>

                <ProgressBar
                  value={ratio}
                  className="mt-2"
                  tone={done ? "bg-primary" : "bg-tone-blue"}
                />

                {goal.notes && (
                  <p className="mt-2.5 text-[11px] leading-5 font-medium text-muted-foreground">
                    {goal.notes}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-foreground/[0.05] pt-2.5">
                  <NumberInput
                    value={goal.target}
                    min={1}
                    onChange={(next) => updateGoal(goal.id, { target: next ?? 1 })}
                    className="h-8 w-28"
                    id={`goal-target-${goal.id}`}
                  />
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => updateGoal(goal.id, { active: !goal.active })}
                  >
                    {goal.active ? "Pause" : "Resume"}
                  </Button>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The date window a goal period covers. */
function windowFor(period: GoalPeriod, weekStartsOn: 0 | 1): [Date, Date] {
  const now = new Date();
  switch (period) {
    case "week":
      return [startOfWeek(now, weekStartsOn), endOfWeek(now, weekStartsOn)];
    case "month":
      return [startOfMonth(now), now];
    case "quarter": {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return [quarterStart, now];
    }
    default:
      return [new Date(0), now];
  }
}
