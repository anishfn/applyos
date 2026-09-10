"use client";

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check } from "@/components/ui/icons";
import { BlurFade } from "@/components/marketing/blur-fade";
import { CopyCommand } from "@/components/marketing/copy-command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Entrance choreography: blur clears, opacity rises, staggered top to bottom. */
const STEP = 0.09;

const PROMISES = ["No sign-up", "Works offline", "Your data stays yours"];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pt-28 sm:px-6 md:px-8 md:pt-32">
      <GlowBackdrop />

      <div className="relative mx-auto w-full max-w-5xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <BlurFade delay={0} y={6}>
            <p className="inline-flex items-center gap-2 rounded-full bg-popover/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground edge">
              <span className="size-1.5 rounded-full bg-primary" />
              Free and open source. No account.
            </p>
          </BlurFade>

          <BlurFade delay={STEP} blur={10} className="mt-6">
            <h1 className="font-runde text-[2.375rem] leading-[1.04] font-bold tracking-[-0.03em] text-balance sm:text-5xl md:text-[3.75rem]">
              The{" "}
              <span className="relative inline-block">
                easy
                {/* A marker underline, sitting just clear of the descenders. */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-[0.02em] h-[0.08em] rounded-full bg-primary"
                />
              </span>{" "}
              way to run your job search
            </h1>
          </BlurFade>

          <BlurFade delay={STEP * 2} className="mt-5 max-w-xl">
            <p className="text-base leading-7 font-medium text-pretty text-muted-foreground sm:text-[1.0625rem]">
              Paste a job link and it&rsquo;s saved, company and role already filled in. One place
              for every application, interview and follow-up.
            </p>
          </BlurFade>

          <BlurFade
            delay={STEP * 3}
            className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          >
            <Button href="/app" variant="primary" size="lg" className="group w-full sm:w-auto">
              Start in one click
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
            <CopyCommand prefix="git clone " command="github.com/anishfn/applyos" />
          </BlurFade>

          <BlurFade delay={STEP * 4} y={6} className="mt-6">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {PROMISES.map((promise) => (
                <li
                  key={promise}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                >
                  <Check className="size-3.5 text-primary" />
                  {promise}
                </li>
              ))}
            </ul>
          </BlurFade>
        </div>

        <BlurFade delay={STEP * 5} y={18} blur={12} duration={0.75} className="mt-12 sm:mt-16">
          <AppPreview />
        </BlurFade>
      </div>
    </section>
  );
}

/** One soft pool of brand colour behind the headline. No hard edges, no banding. */
function GlowBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 size-[46rem] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[130px]" />
    </div>
  );
}

/**
 * A 16:9 miniature of the real dashboard, built from the same design tokens.
 *
 * Drawn rather than screenshotted so it stays truthful in both themes and never
 * goes stale when the app changes. It tilts back a few degrees as the page
 * scrolls, which is the only depth cue on the section.
 */
function AppPreview() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!ref.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { rotateX: 8, scale: 0.97 },
        {
          rotateX: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top 92%", end: "top 34%", scrub: 0.5 },
        },
      );
    }, ref);
    return () => context.revert();
  }, []);

  return (
    <div style={{ perspective: "1600px" }}>
      <div
        ref={ref}
        className="relative aspect-video w-full rounded-2xl bg-muted p-1.5 edge sm:rounded-3xl sm:p-2 dark:bg-card"
        style={{ transformOrigin: "50% 0%" }}
      >
        <div className="absolute inset-1.5 flex flex-col overflow-hidden rounded-xl bg-popover sm:inset-2 sm:rounded-[1.25rem] dark:bg-background">
          {/* Window bar, so the frame reads as a product and not a diagram. */}
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-foreground/[0.06] px-3">
            <span className="flex gap-1.5">
              <span className="size-2 rounded-full bg-foreground/12" />
              <span className="size-2 rounded-full bg-foreground/12" />
              <span className="size-2 rounded-full bg-foreground/12" />
            </span>
            <span className="mx-auto hidden rounded-full bg-foreground/[0.05] px-3 py-0.5 font-mono text-[9px] text-muted-foreground sm:block">
              applyos.local/app
            </span>
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Sidebar */}
            <div className="hidden w-40 shrink-0 flex-col gap-0.5 border-r border-foreground/[0.06] p-2.5 sm:flex lg:w-44">
              <div className="mb-2 flex items-center gap-2">
                <span className="size-4 rounded-md bg-primary" />
                <span className="h-2 w-14 rounded-full bg-foreground/12" />
              </div>
              <span className="mb-1.5 h-6 rounded-full bg-primary/90" />
              {NAV.map((label, index) => (
                <span
                  key={label}
                  className={cn(
                    "flex h-6 items-center gap-2 rounded-full px-2 text-[10px] font-medium",
                    index === 1 ? "bg-muted text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current opacity-40" />
                  {label}
                </span>
              ))}
            </div>

            {/* Content */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2.5">
              <div className="flex shrink-0 items-baseline justify-between">
                <span className="font-runde text-sm font-semibold">Good morning</span>
                <span className="h-5 w-20 rounded-full bg-primary/80" />
              </div>

              <div className="hidden shrink-0 grid-cols-4 gap-2 sm:grid">
                {METRICS.map((metric) => (
                  <div key={metric.label} className="rounded-lg bg-card p-2 edge">
                    <p className="text-[9px] font-medium text-muted-foreground">{metric.label}</p>
                    <p className="mt-0.5 font-runde text-base leading-none font-semibold tabular-nums">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid min-h-0 flex-1 gap-2 sm:grid-rows-2 lg:grid-cols-12">
                <Panel title="Needs you today" className="lg:col-span-7">
                  {ATTENTION.map((row) => (
                    <Row key={row.title} title={row.title} meta={row.meta} tone={row.tone} action />
                  ))}
                </Panel>

                <Panel title="Upcoming" className="hidden lg:col-span-5 lg:flex">
                  {UPCOMING.map((row) => (
                    <Row key={row.title} title={row.title} meta={row.meta} tone={row.tone} trailing={row.when} />
                  ))}
                </Panel>

                <Panel title="Latest on your applications" className="hidden lg:col-span-7 lg:flex">
                  {RECENT.map((row) => (
                    <Row key={row.title} title={row.title} meta={row.meta} tone={row.tone} trailing={row.when} />
                  ))}
                </Panel>

                <Panel title="Your pipeline" className="hidden sm:flex lg:col-span-5">
                  <div className="flex min-h-0 flex-1 flex-col justify-evenly px-2.5 py-1">
                    {FUNNEL.map((row, index) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 truncate text-[9px] text-muted-foreground">
                          {row.label}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/[0.05]">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              index === FUNNEL.length - 1 ? "bg-primary" : "bg-primary/45",
                            )}
                            style={{ width: row.width }}
                          />
                        </span>
                        <span className="w-4 shrink-0 text-right font-mono text-[9px] text-muted-foreground tabular-nums">
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-lg bg-card edge", className)}>
      <div className="shrink-0 border-b border-foreground/[0.06] px-2.5 py-1.5">
        <span className="font-runde text-[10px] font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({
  title,
  meta,
  tone,
  trailing,
  action = false,
}: {
  title: string;
  meta: string;
  tone: string;
  trailing?: string;
  action?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center gap-2 border-b border-foreground/[0.04] px-2.5 last:border-b-0">
      <span className={cn("size-1.5 shrink-0 rounded-full", tone)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-medium">{title}</span>
        <span className="block truncate text-[9px] text-muted-foreground">{meta}</span>
      </span>
      {trailing && (
        <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{trailing}</span>
      )}
      {action && <span className="h-4 w-12 shrink-0 rounded-full bg-foreground/[0.06]" />}
    </div>
  );
}

const NAV = ["Today", "Dashboard", "Analytics", "Applications", "Pipeline", "Jobs", "Interviews", "Follow-ups", "Contacts"];

const METRICS = [
  { label: "Applications", value: "27" },
  { label: "Active", value: "14" },
  { label: "Interviews", value: "9" },
  { label: "Offers", value: "2" },
];

const ATTENTION = [
  { title: "Follow up with Stripe", meta: "6 days overdue", tone: "bg-tone-rose" },
  { title: "Interview tomorrow", meta: "Linear, round 2", tone: "bg-tone-amber" },
  { title: "Send a thank-you note", meta: "Vercel", tone: "bg-tone-amber" },
  { title: "Decide on the offer", meta: "3 days left", tone: "bg-tone-rose" },
];

const UPCOMING = [
  { title: "Linear, round 1", meta: "Senior Product Engineer", when: "10:00", tone: "bg-tone-violet" },
  { title: "Follow-up due", meta: "Notion", when: "Today", tone: "bg-tone-blue" },
  { title: "Figma closes", meta: "Staff Frontend Engineer", when: "in 2d", tone: "bg-tone-rose" },
];

const RECENT = [
  { title: "Senior Product Engineer", meta: "Datadog", when: "1h", tone: "bg-tone-teal" },
  { title: "Backend Engineer, Payments", meta: "Retool", when: "2h", tone: "bg-tone-teal" },
  { title: "Full-stack Engineer", meta: "Render", when: "4h", tone: "bg-tone-neutral" },
];

const FUNNEL = [
  { label: "Applied", width: "100%", count: "27" },
  { label: "Screening", width: "50%", count: "14" },
  { label: "Interview", width: "33%", count: "9" },
  { label: "Final", width: "19%", count: "5" },
  { label: "Offer", width: "8%", count: "2" },
];
