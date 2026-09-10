import * as React from "react";
import {
  FOLLOW_UP_STATUS_CONFIG,
  INTERVIEW_STATUS_CONFIG,
  INTERVIEW_TYPE_CONFIG,
  PRIORITY_CONFIG,
  PRIORITY_RANK,
  RELATIONSHIP_CONFIG,
  SOURCE_CONFIG,
  STATUS_CONFIG,
  TASK_STATUS_CONFIG,
  TONE_DOT,
  TONE_TEXT,
  WORK_MODE_CONFIG,
  type OptionConfig,
} from "@/lib/constants";
import type {
  ApplicationStatus,
  FollowUpStatus,
  InterviewStatus,
  InterviewType,
  Priority,
  Relationship,
  Source,
  TaskStatus,
  Tone,
  WorkMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One badge shape for the whole app: a neutral pill carrying a coloured dot.
 *
 * Keeping the fill neutral and letting a 6px dot do the signalling is what lets
 * a table of forty rows stay readable, fourteen saturated pills would not.
 */

export function ToneDot({ tone, className }: { tone: Tone; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone], className)}
    />
  );
}

interface BadgeProps {
  className?: string;
  /** Hides the label, leaving only the dot. For very dense rows. */
  dotOnly?: boolean;
  size?: "sm" | "md";
}

function ConfigBadge<T extends string>({
  config,
  className,
  dotOnly,
  size = "md",
}: BadgeProps & { config: OptionConfig<T> }) {
  if (dotOnly) {
    return (
      <span className="inline-flex items-center" title={config.label}>
        <ToneDot tone={config.tone} />
        <span className="sr-only">{config.label}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-foreground/[0.07] bg-foreground/[0.045]",
        "font-medium whitespace-nowrap text-foreground/85",
        size === "sm" ? "h-5 px-2 text-[11px]" : "h-6 px-2.5 text-xs",
        className,
      )}
    >
      <ToneDot tone={config.tone} />
      {config.label}
    </span>
  );
}

export function StatusBadge({
  status,
  ...props
}: BadgeProps & { status: ApplicationStatus }) {
  return <ConfigBadge config={STATUS_CONFIG[status]} {...props} />;
}

export function InterviewStatusBadge({
  status,
  ...props
}: BadgeProps & { status: InterviewStatus }) {
  return <ConfigBadge config={INTERVIEW_STATUS_CONFIG[status]} {...props} />;
}

export function InterviewTypeBadge({ type, ...props }: BadgeProps & { type: InterviewType }) {
  return <ConfigBadge config={INTERVIEW_TYPE_CONFIG[type]} {...props} />;
}

export function TaskStatusBadge({ status, ...props }: BadgeProps & { status: TaskStatus }) {
  return <ConfigBadge config={TASK_STATUS_CONFIG[status]} {...props} />;
}

export function FollowUpStatusBadge({ status, ...props }: BadgeProps & { status: FollowUpStatus }) {
  return <ConfigBadge config={FOLLOW_UP_STATUS_CONFIG[status]} {...props} />;
}

export function RelationshipBadge({
  relationship,
  ...props
}: BadgeProps & { relationship: Relationship }) {
  return <ConfigBadge config={RELATIONSHIP_CONFIG[relationship]} {...props} />;
}

export function SourceBadge({ source, ...props }: BadgeProps & { source: Source }) {
  return <ConfigBadge config={SOURCE_CONFIG[source]} {...props} />;
}

export function WorkModeBadge({ mode, ...props }: BadgeProps & { mode: WorkMode }) {
  return <ConfigBadge config={WORK_MODE_CONFIG[mode]} {...props} />;
}

/**
 * Priority reads as signal bars rather than another pill, in a table the eye
 * picks up height differences faster than it reads a second word.
 */
export function PriorityBadge({
  priority,
  className,
  showLabel = false,
}: {
  priority: Priority;
  className?: string;
  showLabel?: boolean;
}) {
  const config = PRIORITY_CONFIG[priority];
  const level = PRIORITY_RANK[priority];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={`${config.label} priority`}
    >
      <span aria-hidden className="flex items-end gap-[2px]">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "w-[3px] rounded-full transition-colors duration-200",
              index === 0 && "h-[5px]",
              index === 1 && "h-[8px]",
              index === 2 && "h-[11px]",
              index === 3 && "h-[14px]",
              index <= level ? TONE_DOT[config.tone] : "bg-foreground/12",
            )}
          />
        ))}
      </span>
      {showLabel && (
        <span className={cn("text-xs font-medium", TONE_TEXT[config.tone])}>{config.label}</span>
      )}
      <span className="sr-only">{config.label} priority</span>
    </span>
  );
}

/** Free-form tag chip. */
export function TagChip({
  label,
  onRemove,
  className,
}: {
  label: string;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full border border-foreground/[0.07] bg-foreground/[0.035] px-2",
        "text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="-mr-0.5 cursor-pointer rounded-full px-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          ×
        </button>
      )}
    </span>
  );
}
