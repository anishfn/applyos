"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Rocket, Sparkles } from "@/components/ui/icons";
import { toast } from "sonner";
import { MetricCard } from "@/components/common/metric-card";
import { EmptyState } from "@/components/common/empty-state";
import { MetricSkeleton, PageSkeleton } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { Segmented } from "@/components/common/form";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import {
  FunnelPanel,
  RecentApplications,
  UpcomingPanel,
} from "@/components/dashboard/panels";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { computeSummary, computeTrend, RANGES, type RangeKey } from "@/lib/analytics";
import { getProfile } from "@/lib/data/actions";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { seedDemoWorkspace } from "@/lib/data/seed";
import { buildAttentionItems, buildUpcoming, toApplicationViews } from "@/lib/derive";

export default function DashboardPage() {
  const status = useStoreStatus();
  const { openQuickAdd } = useAppUI();
  const [range, setRange] = React.useState<RangeKey>("30d");

  const applications = useCollection("applications");
  const companies = useCollection("companies");
  const interviews = useCollection("interviews");
  const tasks = useCollection("tasks");
  const followUps = useCollection("followUps");
  const contacts = useCollection("contacts");
  const activities = useCollection("activities");
  const resumes = useCollection("resumes");
  const profiles = useCollection("profiles");

  const profile = React.useMemo(() => profiles[0] ?? getProfile(), [profiles]);

  const views = React.useMemo(
    () => toApplicationViews(applications, companies),
    [applications, companies],
  );

  const analyticsInput = React.useMemo(
    () => ({ applications, interviews, activities, companies, contacts, followUps, resumes }),
    [applications, interviews, activities, companies, contacts, followUps, resumes],
  );

  const summary = React.useMemo(
    () => computeSummary(analyticsInput, range),
    [analyticsInput, range],
  );

  const trend = React.useMemo(
    () => computeTrend(analyticsInput, range).map((point) => point.value),
    [analyticsInput, range],
  );

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

  const upcoming = React.useMemo(
    () =>
      buildUpcoming({
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

  if (status.status !== "ready") return <PageSkeleton />;

  const isEmpty = applications.length === 0 && companies.length === 0;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeader
        title={`${greeting()}${profile.name && profile.name !== "You" ? `, ${profile.name.split(" ")[0]}` : ""}`}
        description={summaryLine(attention.length, upcoming.length)}
        actions={
          <>
            <Segmented
              value={range}
              onChange={setRange}
              ariaLabel="Time range"
              className="hidden sm:inline-flex"
              options={(Object.keys(RANGES) as RangeKey[]).map((key) => ({
                value: key,
                label: RANGES[key].label,
              }))}
            />
            <Button variant="primary" size="sm" onClick={() => openQuickAdd("application")}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add application</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </>
        }
      />

      {isEmpty ? (
        <FirstRun />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <React.Suspense fallback={<MetricSkeleton />}>
              <MetricCard
                label="Applications"
                value={summary.totalApplications}
                delta={summary.deltas.totalApplications}
                hint={`${summary.applicationsPerWeek}/week`}
                trend={trend}
              />
              <MetricCard
                label="Active"
                value={summary.activeApplications}
                delta={summary.deltas.activeApplications}
                hint="Still in play"
              />
              <MetricCard
                label="Interviews"
                value={summary.interviewCount}
                delta={summary.deltas.interviewCount}
                hint={`${summary.interviewsPerWeek}/week`}
              />
              <MetricCard
                label="Offers"
                value={summary.offerCount}
                delta={summary.deltas.offerCount}
                hint={
                  summary.averageTimeToOfferDays != null
                    ? `${summary.averageTimeToOfferDays}d to offer`
                    : "None yet"
                }
              />
            </React.Suspense>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <NeedsAttention items={attention} className="lg:col-span-7" />
            <UpcomingPanel items={upcoming} className="lg:col-span-5" />
            <RecentApplications applications={views} className="lg:col-span-7" />
            <FunnelPanel applications={applications} activities={activities} className="lg:col-span-5" />
          </div>

          <p className="pb-1 text-xs font-medium text-muted-foreground">
            Response rates, what converts and where your replies come from live in{" "}
            <Link
              href="/app/analytics"
              className="text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              Analytics
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function summaryLine(attention: number, upcoming: number): string {
  if (attention === 0 && upcoming === 0) return "You're all caught up.";
  const parts: string[] = [];
  if (attention > 0) parts.push(`${attention} thing${attention === 1 ? "" : "s"} need you today`);
  if (upcoming > 0) parts.push(`${upcoming} more coming up`);
  return `${parts.join(" · ")}.`;
}

/** First-run: two honest ways in, start real, or explore with sample data. */
function FirstRun() {
  const { openQuickAdd } = useAppUI();
  const [seeding, setSeeding] = React.useState(false);

  const seed = async () => {
    setSeeding(true);
    try {
      await seedDemoWorkspace();
      toast.success("Demo workspace loaded", {
        description: "Clear it any time from Settings.",
      });
    } catch (error) {
      toast.error("Couldn't load the demo", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <Surface className="flex flex-1 items-center justify-center lg:col-span-7">
        <EmptyState
          icon={Rocket}
          title="Let's get your first one in"
          description="Paste a job link and ApplyOS fills in the company, the role and where you found it. It takes about ten seconds."
          action={{ label: "Add your first application", onClick: () => openQuickAdd("application") }}
          secondaryAction={{ label: "Save a job for later", onClick: () => openQuickAdd("job") }}
        />
      </Surface>

      <Surface className="flex flex-col justify-center gap-3 p-6 lg:col-span-5">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary-ink">
          <Sparkles className="size-4" />
        </span>
        <div>
          <h3 className="font-runde text-base font-semibold tracking-tight">
            Want to look around first?
          </h3>
          <p className="mt-1 text-xs leading-5 font-medium text-muted-foreground">
            Load a realistic sample search, applications mid-pipeline, interviews on the calendar,
            follow-ups going stale. Everything is real data in your workspace, and you can wipe it
            in one click from Settings.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={seed} disabled={seeding} className="self-start">
          {seeding ? "Loading…" : "Load demo workspace"}
        </Button>
      </Surface>
    </div>
  );
}
