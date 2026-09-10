"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
  Send,
  Video,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/common/page-header";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { completeNextAction, toggleTask, updateFollowUp } from "@/lib/data/actions";
import { store } from "@/lib/data/store";
import { addDays, formatDueDate, toDateOnly } from "@/lib/date";
import type { AttentionItem, AttentionKind, QuickAction } from "@/lib/derive";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<AttentionKind, React.ComponentType<{ className?: string }>> = {
  interview_today: Video,
  interview_tomorrow: CalendarClock,
  follow_up_overdue: Send,
  follow_up_due: Send,
  next_action_due: ArrowRight,
  task_overdue: CheckCircle2,
  deadline_approaching: AlarmClock,
  offer_deadline: Flame,
  recruiter_waiting: Clock,
  stale_application: Clock,
};

/** Runs the one-click actions offered on each attention row. */
export function useAttentionActions() {
  const router = useRouter();
  const { openQuickAdd } = useAppUI();

  return React.useCallback(
    (action: QuickAction, href: string) => {
      switch (action.kind) {
        case "complete_task": {
          toggleTask(action.entityId);
          toast.success("Task completed", {
            action: { label: "Undo", onClick: () => toggleTask(action.entityId) },
          });
          break;
        }
        case "mark_follow_up_sent": {
          const before = store.find("followUps", action.entityId);
          updateFollowUp(action.entityId, { status: "sent" });
          toast.success("Marked as sent", {
            action: {
              label: "Undo",
              onClick: () =>
                updateFollowUp(action.entityId, {
                  status: before?.status ?? "pending",
                  sentAt: before?.sentAt ?? null,
                }),
            },
          });
          break;
        }
        case "snooze_follow_up": {
          const followUp = store.find("followUps", action.entityId);
          if (!followUp) break;
          const previous = followUp.dueDate;
          updateFollowUp(action.entityId, { dueDate: toDateOnly(addDays(new Date(), 3)) });
          toast("Snoozed 3 days", {
            action: {
              label: "Undo",
              onClick: () => updateFollowUp(action.entityId, { dueDate: previous }),
            },
          });
          break;
        }
        case "complete_next_action": {
          const application = store.find("applications", action.entityId);
          const previousAction = application?.nextAction ?? null;
          const previousDate = application?.nextActionDate ?? null;
          completeNextAction(action.entityId);
          toast.success("Nice, that's done", {
            action: {
              label: "Undo",
              onClick: () =>
                store.patch("applications", action.entityId, {
                  nextAction: previousAction,
                  nextActionDate: previousDate,
                }),
            },
          });
          break;
        }
        case "create_follow_up": {
          openQuickAdd("follow_up", { applicationId: action.entityId });
          break;
        }
        case "log_interview":
        case "open":
        default:
          router.push(href);
      }
    },
    [openQuickAdd, router],
  );
}

export function NeedsAttention({
  items,
  limit = 6,
  className,
}: {
  items: AttentionItem[];
  limit?: number;
  className?: string;
}) {
  const run = useAttentionActions();
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? items : items.slice(0, limit);

  return (
    <Surface className={cn("flex flex-col overflow-hidden", className)}>
      <SectionHeader
        title="Needs you today"
        count={items.length}
        action={
          items.length > limit ? (
            <Button variant="ghost" size="xs" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : `Show all ${items.length}`}
            </Button>
          ) : null
        }
        className="border-b border-foreground/[0.06]"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="You're all caught up"
          description="Nothing is overdue and nothing is slipping. Good moment to go find the next one."
          action={{ label: "Browse saved jobs", href: "/app/jobs" }}
          compact
        />
      ) : (
        <ul className="divide-y divide-foreground/[0.05]">
          {visible.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li
                key={item.id}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 ease-out hover:bg-foreground/[0.02]"
              >
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
                    item.severity === "critical" && "bg-tone-rose/12 text-tone-rose",
                    item.severity === "warning" && "bg-tone-amber/12 text-tone-amber",
                    item.severity === "info" && "bg-foreground/[0.05] text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>

                <Link href={item.href} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.subtitle}
                  </span>
                </Link>

                {item.date && (
                  <span
                    className={cn(
                      "hidden shrink-0 font-mono text-[11px] font-medium tabular-nums sm:block",
                      item.severity === "critical" ? "text-tone-rose" : "text-muted-foreground",
                    )}
                  >
                    {formatDueDate(item.date)}
                  </span>
                )}

                <div className="flex shrink-0 items-center gap-1">
                  {item.secondaryAction && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 sm:inline-flex"
                      onClick={() => run(item.secondaryAction!, item.href)}
                    >
                      {item.secondaryAction.label}
                    </Button>
                  )}
                  {item.primaryAction && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => run(item.primaryAction!, item.href)}
                    >
                      {item.primaryAction.label}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Surface>
  );
}
