"use client";

import * as React from "react";
import { BarChart3, Download } from "@/components/ui/icons";
import { toast } from "sonner";
import { Breakdown, ColumnChart } from "@/components/common/charts";
import { EmptyState } from "@/components/common/empty-state";
import { Segmented } from "@/components/common/form";
import { PageSkeleton } from "@/components/common/loading";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { InsightsPanel } from "@/components/dashboard/panels";
import { Sankey } from "@/components/analytics/sankey";
import { useAppUI } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { FUNNEL_STATUSES } from "@/lib/constants";
import {
  computeBreakdown,
  computeFunnel,
  computeInsights,
  computeSummary,
  computeTrend,
  RANGES,
  type BreakdownDimension,
  type RangeKey,
} from "@/lib/analytics";
import { useCollection, useStoreStatus } from "@/lib/data/hooks";
import { exportEverything } from "@/lib/export";
import { computeSankey } from "@/lib/sankey";
import { compactNumber, formatPercent, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

const DIMENSIONS: Array<{ value: BreakdownDimension; label: string }> = [
  { value: "source", label: "Source" },
  { value: "resume", label: "Resume" },
  { value: "role", label: "Role" },
  { value: "company", label: "Company" },
  { value: "location", label: "Location" },
  { value: "work_mode", label: "Work mode" },
];

export default function AnalyticsPage() {
  const status = useStoreStatus();
  const { openQuickAdd } = useAppUI();

  const applications = useCollection("applications");
  const interviews = useCollection("interviews");
  const activities = useCollection("activities");
  const companies = useCollection("companies");
  const contacts = useCollection("contacts");
  const followUps = useCollection("followUps");
  const resumes = useCollection("resumes");

  const [range, setRange] = React.useState<RangeKey>("90d");
  const [dimension, setDimension] = React.useState<BreakdownDimension>("source");

  const input = React.useMemo(
    () => ({ applications, interviews, activities, companies, contacts, followUps, resumes }),
    [applications, interviews, activities, companies, contacts, followUps, resumes],
  );

  const summary = React.useMemo(() => computeSummary(input, range), [input, range]);
  const trend = React.useMemo(() => computeTrend(input, range), [input, range]);
  const insights = React.useMemo(() => computeInsights(input), [input]);
  const sankey = React.useMemo(
    () => computeSankey(applications, activities),
    [applications, activities],
  );
  // Wishlist and preparing are not conversions, they are intentions, so the
  // conversion list starts at the point something was actually sent.
  const funnel = React.useMemo(
    () =>
      computeFunnel(applications, FUNNEL_STATUSES, activities).filter(
        (point) => !["wishlist", "preparing"].includes(point.status),
      ),
    [applications, activities],
  );
  const breakdown = React.useMemo(
    () => computeBreakdown(input, dimension, range),
    [input, dimension, range],
  );

  // Aggregate daily buckets into weeks when the range is long, so bars stay readable.
  const chartData = React.useMemo(() => {
    if (trend.length <= 45) {
      return trend.map((point) => ({
        label: point.label,
        value: point.value,
        secondary: point.secondary,
      }));
    }
    const weeks: Array<{ label: string; value: number; secondary: number }> = [];
    for (let index = 0; index < trend.length; index += 7) {
      const slice = trend.slice(index, index + 7);
      weeks.push({
        label: slice[0].label,
        value: slice.reduce((sum, point) => sum + point.value, 0),
        secondary: slice.reduce((sum, point) => sum + point.secondary, 0),
      });
    }
    return weeks;
  }, [trend]);

  const weekly = trend.length > 45;

  if (status.status !== "ready") return <PageSkeleton />;

  if (applications.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <PageHeader title="Analytics" description="What's actually working in your search." />
        <Surface className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={BarChart3}
            title="Nothing to show yet"
            description="Send a handful of applications and this page fills in on its own: reply rates, what converts, and which sources are worth your time."
            action={{ label: "Add an application", onClick: () => openQuickAdd("application") }}
          />
        </Surface>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-4">
      <PageHeader
        title="Analytics"
        description="What's actually working in your search."
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                exportEverything();
                toast.success("Workspace exported");
              }}
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </>
        }
      />

      {/* The four numbers that decide what to change ---------------------- */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Applications"
          value={summary.totalApplications}
          delta={summary.deltas.totalApplications}
          hint={`${summary.applicationsPerWeek}/week`}
          trend={trend.map((point) => point.value)}
        />
        <MetricCard
          label="Response rate"
          value={summary.responseRate == null ? "-" : formatPercent(summary.responseRate)}
          delta={summary.deltas.responseRate}
          hint={
            summary.averageResponseDays != null
              ? `~${summary.averageResponseDays}d to hear back`
              : "Needs more data"
          }
        />
        <MetricCard
          label="Interview rate"
          value={summary.interviewRate == null ? "-" : formatPercent(summary.interviewRate)}
          delta={summary.deltas.interviewRate}
          hint="Reached a loop"
        />
        <MetricCard
          label="Offers"
          value={summary.offerCount}
          delta={summary.deltas.offerCount}
          hint={
            summary.averageTimeToOfferDays != null
              ? `${summary.averageTimeToOfferDays}d from applying`
              : "None yet"
          }
        />
      </section>

      {/* The flow --------------------------------------------------------- */}
      <section>
        <SectionTitle
          title="Where your applications go"
          description="Every application you have submitted, following the path it actually took. Thickness is volume."
        />
        <Surface className="overflow-hidden p-4">
          {sankey.total === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Mark an application as applied and the flow appears here.
            </p>
          ) : (
            <Sankey data={sankey} height={sankey.nodes.length > 10 ? 420 : 320} />
          )}
        </Surface>
      </section>

      {/* Stage conversion + what's working -------------------------------- */}
      <section className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionTitle
            title="Stage conversion"
            description="How many carry on from each stage to the next."
          />
          <Surface className="overflow-hidden">
            <ul className="divide-y divide-foreground/[0.05]">
              {funnel.map((point, index) => {
                const previous = index === 0 ? null : funnel[index - 1];
                const conversion =
                  previous && previous.count > 0 ? point.count / previous.count : null;
                const width = funnel[0].count > 0 ? (point.count / funnel[0].count) * 100 : 0;
                return (
                  <li key={point.status} className="px-4 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{point.label}</span>
                      <span className="flex items-baseline gap-2">
                        <span className="font-runde text-sm font-semibold tabular-nums">
                          {point.count}
                        </span>
                        {conversion != null && (
                          <span
                            className={cn(
                              "w-10 text-right font-mono text-[11px] tabular-nums",
                              conversion >= 0.5 ? "text-tone-green" : "text-muted-foreground",
                            )}
                          >
                            {formatPercent(conversion)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.05]">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-[width] duration-500 ease-out"
                        style={{ width: `${Math.max(width, 1)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-foreground/[0.06] px-4 py-2.5 text-[11px] font-medium text-muted-foreground">
              Each stage counts every application that ever reached it, including ones that were
              later rejected.
            </p>
          </Surface>
        </div>

        <div className="lg:col-span-7">
          <SectionTitle
            title="What's working"
            description="The same applications, cut by where they came from."
          />
          <Surface className="overflow-hidden">
            <SectionHeader
              title={DIMENSIONS.find((item) => item.value === dimension)?.label ?? ""}
              action={
                <Segmented
                  value={dimension}
                  onChange={setDimension}
                  ariaLabel="Breakdown dimension"
                  size="sm"
                  options={DIMENSIONS}
                />
              }
              className="border-b border-foreground/[0.06]"
            />
            <div className="p-3">
              <Breakdown
                rows={breakdown.slice(0, 10).map((entry) => ({
                  label: entry.label,
                  value: entry.total,
                  meta:
                    entry.responseRate != null
                      ? `${formatPercent(entry.responseRate)} reply`
                      : pluralize(entry.responded, "reply", "replies"),
                }))}
                emptyLabel="No applications in this range"
              />
              {breakdown.length > 0 && (
                <p className="mt-2 px-2 text-[11px] font-medium text-muted-foreground">
                  Response rates only appear once a group has at least four applications behind it.
                </p>
              )}
            </div>
          </Surface>
        </div>
      </section>

      {/* Pace ------------------------------------------------------------- */}
      <section>
        <SectionTitle title="Pace" description="Volume over time, and how it converts." />
        <Surface className="overflow-hidden">
          <SectionHeader
            title={weekly ? "Per week" : "Per day"}
            action={
              <span className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary" />
                  Applications
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-foreground/25" />
                  Interviews
                </span>
              </span>
            }
            className="border-b border-foreground/[0.06]"
          />
          <div className="p-4">
            <ColumnChart
              data={chartData}
              height={150}
              valueLabel="applied"
              secondaryLabel="interviews"
            />
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-foreground/[0.06] bg-foreground/[0.05] sm:grid-cols-4">
            <Tile label="Still open" value={summary.activeApplications} />
            <Tile
              label="Rejection rate"
              value={summary.rejectionRate == null ? "-" : formatPercent(summary.rejectionRate)}
            />
            <Tile
              label="Went quiet"
              value={summary.ghostRate == null ? "-" : formatPercent(summary.ghostRate)}
            />
            <Tile
              label="Avg offer"
              value={summary.averageSalary == null ? "-" : `$${compactNumber(summary.averageSalary)}`}
            />
          </div>
        </Surface>
      </section>

      {/* Observations ----------------------------------------------------- */}
      <section>
        <SectionTitle title="Worth noticing" description="Patterns with enough data behind them." />
        <InsightsPanel insights={insights} limit={8} />
      </section>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-2.5 px-1">
      <h2 className="font-runde text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{description}</p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-runde text-lg leading-none font-semibold tabular-nums">{value}</p>
    </div>
  );
}
