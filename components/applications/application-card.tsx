"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, ExternalLink, MapPin } from "@/components/ui/icons";
import { PriorityBadge, StatusBadge, TagChip } from "@/components/common/badges";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { formatDueDate, formatRelative, isPastDate } from "@/lib/date";
import type { ApplicationView } from "@/lib/derive";
import { formatSalary } from "@/lib/format";
import { WORK_MODE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Compact card for the list view and the kanban board.
 *
 * `dense` drops the metadata line so a board column can show more cards without
 * the eye losing the company name.
 */
export function ApplicationCard({
  application,
  dense = false,
  className,
  showStatus = true,
  dragging = false,
}: {
  application: ApplicationView;
  dense?: boolean;
  className?: string;
  showStatus?: boolean;
  dragging?: boolean;
}) {
  const salary = formatSalary(application.salary);
  const overdue = application.nextActionDate ? isPastDate(application.nextActionDate) : false;

  return (
    <article
      className={cn(
        "group relative rounded-xl bg-card p-3 edge",
        "transition-colors duration-200 ease-out hover:bg-muted/70 motion-reduce:transition-none",
        "edge",
        dragging && "opacity-50",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <CompanyAvatar
          name={application.companyName}
          domain={application.company?.domain}
          size={dense ? "sm" : "md"}
        />
        <div className="min-w-0 flex-1">
          <Link href={`/app/applications/${application.id}`} className="block min-w-0">
            <h3 className="truncate font-runde text-sm font-semibold tracking-tight transition-colors group-hover:text-primary">
              {application.position}
            </h3>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {application.companyName}
            </p>
            <span className="absolute inset-0" aria-hidden />
          </Link>
        </div>
        <PriorityBadge priority={application.priority} className="relative z-10 shrink-0" />
      </div>

      {!dense && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
          {salary && <span className="font-mono tabular-nums">{salary}</span>}
          {application.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {application.location}
            </span>
          )}
          {application.workMode && <span>{WORK_MODE_CONFIG[application.workMode].label}</span>}
        </div>
      )}

      {application.nextAction && (
        <div
          className={cn(
            "mt-2.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium",
            overdue ? "bg-tone-rose/10 text-tone-rose" : "bg-foreground/[0.04] text-foreground/75",
          )}
        >
          <CalendarClock className="size-3 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{application.nextAction}</span>
          {application.nextActionDate && (
            <span className="shrink-0 font-mono tabular-nums">
              {formatDueDate(application.nextActionDate)}
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        {showStatus && <StatusBadge status={application.status} size="sm" />}
        {application.referral && (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            Referral
          </span>
        )}
        <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
          {formatRelative(application.updatedAt)}
        </span>
      </div>

      {!dense && application.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {application.tags.map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>
      )}

      {application.jobUrl && (
        <a
          href={application.jobUrl}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(event) => event.stopPropagation()}
          aria-label="Open job posting"
          className="absolute top-2.5 right-2.5 z-10 hidden rounded-full p-1 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-70 hover:!opacity-100 focus-visible:opacity-100 sm:block"
        >
          <ExternalLink className="size-3" />
        </a>
      )}
    </article>
  );
}

/** Card grid used by the list view. */
export function ApplicationCardGrid({ applications }: { applications: ApplicationView[] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {applications.map((application) => (
        <ApplicationCard key={application.id} application={application} />
      ))}
    </div>
  );
}
