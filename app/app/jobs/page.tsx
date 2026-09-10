"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  Trash2,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { SourceBadge, TagChip, WorkModeBadge } from "@/components/common/badges";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { Segmented } from "@/components/common/form";
import { ListSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { FitBadge, FitBreakdown } from "@/components/jobs/fit-score";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { convertJobToApplication, deleteJob, getProfile } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { formatDueDate, formatRelative, isPastDate } from "@/lib/date";
import { formatSalary } from "@/lib/format";
import { hasFitPreferences, scoreJob, type FitScore } from "@/lib/fit-score";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortMode = "fit" | "recent" | "deadline";

export default function JobsPage() {
  const status = useStoreStatus();
  const router = useRouter();
  const { openQuickAdd, deleteWithUndo } = useAppUI();

  const jobs = useCollection("jobs");
  const companies = useCollection("companies");
  const profiles = useCollection("profiles");

  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortMode>("recent");
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const profile = profiles[0] ?? getProfile();
  const fitEnabled = hasFitPreferences(profile.fit);

  const rows = React.useMemo(() => {
    const byId = new Map(companies.map((company) => [company.id, company]));
    const needle = query.trim().toLowerCase();

    const enriched = jobs
      .filter((job) => job.status === "saved")
      .map((job) => {
        const company = byId.get(job.companyId) ?? null;
        return {
          job,
          company,
          fit: fitEnabled ? scoreJob(job, company, profile.fit) : null,
        };
      })
      .filter(({ job, company }) => {
        if (!needle) return true;
        return [job.title, company?.name, job.location, job.skills.join(" ")]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });

    return enriched.sort((a, b) => {
      if (sort === "fit") return (b.fit?.overall ?? -1) - (a.fit?.overall ?? -1);
      if (sort === "deadline") {
        const left = a.job.deadline ? new Date(a.job.deadline).getTime() : Number.POSITIVE_INFINITY;
        const right = b.job.deadline ? new Date(b.job.deadline).getTime() : Number.POSITIVE_INFINITY;
        return left - right;
      }
      return a.job.savedAt < b.job.savedAt ? 1 : -1;
    });
  }, [jobs, companies, query, sort, fitEnabled, profile.fit]);

  if (status.status !== "ready") return <ListSkeleton rows={5} />;

  const savedCount = jobs.filter((job) => job.status === "saved").length;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title="Jobs"
        description="Everything you&rsquo;ve saved but haven&rsquo;t applied to yet."
        actions={
          <Button variant="primary" size="sm" onClick={() => openQuickAdd("job")}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Save a job</span>
          </Button>
        }
      >
        {savedCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1 sm:max-w-72">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Filter by company, role, skill…"
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Segmented
              value={sort}
              onChange={setSort}
              ariaLabel="Sort jobs"
              options={[
                { value: "recent", label: "Recent" },
                { value: "fit", label: "Best fit" },
                { value: "deadline", label: "Closing" },
              ]}
            />
            <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground tabular-nums sm:block">
              {rows.length} saved
            </span>
          </div>
        )}
      </PageHeader>

      {!fitEnabled && savedCount > 0 && (
        <Surface className="flex flex-wrap items-center gap-3 p-3">
          <p className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
            Add your skills, target role and minimum salary and every saved job gets a fit score
            with a breakdown of what&rsquo;s missing.
          </p>
          <Button variant="secondary" size="xs" href="/app/settings">
            Set preferences
          </Button>
        </Surface>
      )}

      {savedCount === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            description="Park interesting roles here while you decide. When you're ready, one click turns a saved job into an application."
            action={{ label: "Save a job", onClick: () => openQuickAdd("job") }}
          />
        </Surface>
      ) : rows.length === 0 ? (
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Search}
            title="No saved jobs match"
            description="Try a different company, role or skill."
            action={{ label: "Clear search", onClick: () => setQuery("") }}
          />
        </Surface>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map(({ job, company, fit }) => (
            <JobRow
              key={job.id}
              job={job}
              companyName={company?.name ?? "Unknown company"}
              companyDomain={company?.domain}
              fit={fit}
              expanded={expanded === job.id}
              onToggle={() => setExpanded(expanded === job.id ? null : job.id)}
              onConvert={() => {
                const application = convertJobToApplication(job.id);
                if (!application) return;
                toast.success("Moved into your pipeline", {
                  description: `${job.title} · ${company?.name ?? ""}`,
                  action: {
                    label: "Open",
                    onClick: () => router.push(`/app/applications/${application.id}`),
                  },
                });
              }}
              onDelete={() => deleteWithUndo(deleteJob(job.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JobRow({
  job,
  companyName,
  companyDomain,
  fit,
  expanded,
  onToggle,
  onConvert,
  onDelete,
}: {
  job: Job;
  companyName: string;
  companyDomain?: string | null;
  fit: FitScore | null;
  expanded: boolean;
  onToggle: () => void;
  onConvert: () => void;
  onDelete: () => void;
}) {
  const salary = formatSalary(job.salary);
  const closing = job.deadline && !isPastDate(job.deadline);

  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 p-3.5">
        <CompanyAvatar name={companyName} domain={companyDomain} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-runde text-sm font-semibold tracking-tight">{job.title}</h3>
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Open job posting"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <Link
            href={`/app/companies/${job.companyId}`}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {companyName}
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-medium text-muted-foreground">
            {salary && <span className="font-mono tabular-nums">{salary}</span>}
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {job.location}
              </span>
            )}
            {job.workMode && <WorkModeBadge mode={job.workMode} size="sm" />}
            {job.source && <SourceBadge source={job.source} size="sm" />}
            {job.deadline && (
              <span className={cn("font-mono tabular-nums", closing ? "text-tone-amber" : "text-tone-rose")}>
                {formatDueDate(job.deadline)}
              </span>
            )}
            <span className="font-mono tabular-nums">saved {formatRelative(job.savedAt)}</span>
          </div>

          {job.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {job.skills.slice(0, 8).map((skill) => (
                <TagChip key={skill} label={skill} />
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {fit && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Show fit breakdown"
              aria-expanded={expanded}
              className="cursor-pointer rounded-full transition-opacity duration-200 hover:opacity-80"
            >
              <FitBadge fit={fit} />
            </button>
          )}
          <Button variant="primary" size="sm" onClick={onConvert}>
            Apply
            <ArrowRight className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Remove ${job.title}`}>
            <Trash2 className="size-3.5" />
          </Button>
          {fit && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggle}
              aria-label={expanded ? "Hide details" : "Show details"}
            >
              <ChevronDown
                className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")}
              />
            </Button>
          )}
        </div>
      </div>

      {expanded && fit && (
        <div className="grid gap-4 border-t border-foreground/[0.06] p-4 sm:grid-cols-2">
          <FitBreakdown fit={fit} />
          {job.description && (
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                Description
              </p>
              <p className="max-h-64 overflow-y-auto text-xs leading-6 font-medium whitespace-pre-wrap text-foreground/80">
                {job.description}
              </p>
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}
