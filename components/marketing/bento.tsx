"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  BarChart3,
  Bookmark,
  CalendarDays,
  Command,
  Link2,
  Send,
  SquareKanban,
  Users,
  Video,
} from "@/components/ui/icons";
import { BlurFade } from "@/components/marketing/blur-fade";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

const CARD =
  "edge rounded-2xl bg-card transition-colors duration-200 ease-out hover:bg-muted/70 motion-reduce:transition-none";

const FEATURES = [
  {
    icon: SquareKanban,
    title: "Drag to move a job along",
    body: "Drop it in the next column and the dates, the follow-up and the history all update themselves.",
  },
  {
    icon: Send,
    title: "Follow-ups that never slip",
    body: "Write it calmly today, schedule it for next Tuesday, send it with one click when the day comes.",
  },
  {
    icon: Video,
    title: "A prep page for every round",
    body: "Company notes, likely questions and your best stories, all sitting on the interview itself.",
  },
  {
    icon: Users,
    title: "Remember who is who",
    body: "Recruiters, referrals and old colleagues, each with the full history of what you talked about.",
  },
  {
    icon: Bookmark,
    title: "Know if a job is worth it",
    body: "Saved jobs get scored against your profile, and you get told exactly which skills are missing.",
  },
  {
    icon: CalendarDays,
    title: "One calendar for all of it",
    body: "Interviews, deadlines, follow-ups and tasks in month, week, day or a simple agenda list.",
  },
];

const QUOTES = [
  {
    body: "It tells me what's late before I've finished my coffee. That's the whole product.",
    handle: "@late-stage-candidate",
  },
  {
    body: "Fifteen tabs and a spreadsheet, replaced by one page that already knows what's overdue.",
    handle: "@switching-teams",
  },
  {
    body: "Finding out resume v4 got twice the replies of v2 changed what I sent for a month.",
    handle: "@backend-to-product",
  },
];

export function Bento() {
  return (
    <section id="features" className="scroll-mt-24 px-5 pt-20 sm:px-6 sm:pt-24 md:px-8 lg:pt-28">
      <div className="mx-auto w-full max-w-5xl">
        <BlurFade inView>
          <h2 className="max-w-xl font-runde text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            It does the boring parts for you
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 font-medium text-muted-foreground">
            You bring the job link. ApplyOS handles the typing, the reminders and the maths.
          </p>
        </BlurFade>

        <div className="mt-10 grid gap-3 sm:gap-4 md:grid-cols-12">
          <BlurFade
            inView
            className={cn(CARD, "flex flex-col justify-between p-5 md:col-span-7 md:row-span-2")}
          >
            <div>
              <IconChip>
                <Link2 className="size-4" />
              </IconChip>
              <h3 className="mt-4 font-runde text-2xl font-semibold tracking-tight sm:text-3xl">
                Paste a link. That&rsquo;s the whole thing.
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-6 font-medium text-muted-foreground">
                ApplyOS reads the company, the role, where you found it and whether it&rsquo;s remote,
                straight off the URL. Greenhouse, Lever, Ashby, Workable, LinkedIn and ordinary
                careers pages all work. You fill in whatever is left, if anything.
              </p>
            </div>
            <UrlDemo />
          </BlurFade>

          <BlurFade inView delay={0.06} className={cn(CARD, "flex flex-col justify-between p-5 md:col-span-5")}>
            <IconChip>
              <Command className="size-4" />
            </IconChip>
            <div className="mt-4">
              <h3 className="font-runde text-base font-semibold tracking-tight">
                One key does most things
              </h3>
              <p className="mt-2 text-sm leading-6 font-medium text-muted-foreground">
                Press <Kbd>A</Kbd> to add a job. Press <Kbd>G</Kbd> then a letter to go anywhere.
                Your hands never have to find the mouse.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {[
                { keys: ["⌘", "K"], label: "Anything" },
                { keys: ["A"], label: "Add a job" },
                { keys: ["G", "P"], label: "Pipeline" },
                { keys: ["/"], label: "Search" },
              ].map((shortcut) => (
                <span key={shortcut.label} className="inline-flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    {shortcut.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {shortcut.label}
                  </span>
                </span>
              ))}
            </div>
          </BlurFade>

          <TestimonialTile className="md:col-span-5" />

          <BlurFade inView delay={0.06} className={cn(CARD, "p-5 md:col-span-4")}>
            <IconChip>
              <BarChart3 className="size-4" />
            </IconChip>
            <h3 className="mt-4 font-runde text-base font-semibold tracking-tight">
              Numbers you can act on
            </h3>
            <p className="mt-2 text-sm leading-6 font-medium text-muted-foreground">
              Which source, which resume and which kind of role actually gets replies. Nothing is
              claimed until there&rsquo;s enough behind it to be true.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { value: "53%", label: "Reply rate" },
                { value: "33%", label: "Reach a loop" },
                { value: "6d", label: "To hear back" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-runde text-2xl font-semibold tabular-nums">{stat.value}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </BlurFade>

          <BlurFade inView delay={0.12} className={cn(CARD, "grid gap-4 p-5 sm:grid-cols-2 md:col-span-8")}>
            {FEATURES.slice(0, 4).map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex gap-3">
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.05] text-muted-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-runde text-sm font-semibold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 font-medium text-muted-foreground">
                      {feature.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </BlurFade>

          {FEATURES.slice(4).map((feature, index) => {
            const Icon = feature.icon;
            return (
              <BlurFade
                key={feature.title}
                inView
                delay={index * 0.06}
                className={cn(CARD, "p-5 md:col-span-6")}
              >
                <IconChip>
                  <Icon className="size-4" />
                </IconChip>
                <h3 className="mt-4 font-runde text-base font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 font-medium text-muted-foreground">
                  {feature.body}
                </p>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary-ink">
      {children}
    </span>
  );
}

/** Cycles through real parser output for a few example URLs. */
function UrlDemo() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  const samples = React.useMemo(
    () => [
      {
        url: "jobs.lever.co/figma/senior-product-engineer",
        company: "Figma",
        role: "Senior Product Engineer",
      },
      { url: "boards.greenhouse.io/stripe/jobs/4567890", company: "Stripe", role: "Your turn" },
      {
        url: "vercel.com/careers/design-engineer-remote",
        company: "Vercel",
        role: "Design Engineer",
      },
    ],
    [],
  );

  React.useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % samples.length), 3600);
    return () => clearInterval(timer);
  }, [reduceMotion, samples.length]);

  const sample = samples[index];

  return (
    <div className="mt-6 rounded-2xl bg-background/60 p-3 edge">
      <AnimatePresence mode="wait">
        <motion.div
          key={sample.url}
          initial={reduceMotion ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(6px)" }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="truncate font-mono text-[11px] text-muted-foreground">{sample.url}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-foreground/[0.04] px-2.5 py-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">Company</p>
              <p className="truncate text-xs font-semibold">{sample.company}</p>
            </div>
            <div className="rounded-lg bg-foreground/[0.04] px-2.5 py-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">Role</p>
              <p className="truncate text-xs font-semibold">{sample.role}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Inverted tile with a rotating quote and an auto-advancing progress pill. */
function TestimonialTile({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % QUOTES.length), 4800);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  return (
    <BlurFade
      inView
      delay={0.06}
      className={cn(
        "flex flex-col justify-between rounded-2xl bg-foreground p-5 text-background",
        className,
      )}
      style={{ cornerShape: "squircle" } as React.CSSProperties}
    >
      {/* All three quotes share one grid cell, so the tile is always as tall as
          the longest one. Swapping them with AnimatePresence resized the tile
          every few seconds, which pushed the whole page down mid-read. */}
      <div className="grid">
        {QUOTES.map((item, quoteIndex) => {
          const active = quoteIndex === index;
          return (
            <motion.blockquote
              key={item.handle}
              aria-hidden={!active}
              className="col-start-1 row-start-1"
              initial={false}
              animate={
                reduceMotion
                  ? { opacity: active ? 1 : 0 }
                  : {
                      opacity: active ? 1 : 0,
                      y: active ? 0 : 8,
                      filter: active ? "blur(0px)" : "blur(8px)",
                    }
              }
              transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ pointerEvents: active ? "auto" : "none" }}
            >
              <p className="font-runde text-lg leading-snug font-semibold tracking-tight text-balance">
                “{item.body}”
              </p>
              <footer className="mt-3 font-mono text-xs text-background/60">{item.handle}</footer>
            </motion.blockquote>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-1.5">
        {QUOTES.map((item, dotIndex) => {
          const active = dotIndex === index;
          return (
            <button
              key={item.handle}
              type="button"
              onClick={() => setIndex(dotIndex)}
              aria-label={`Show quote ${dotIndex + 1}`}
              className={cn(
                "cursor-pointer rounded-full transition-colors duration-200",
                active
                  ? "h-2 w-9 overflow-hidden bg-background/30"
                  : "size-2 bg-background/30 hover:bg-background/55",
              )}
            >
              {active && (
                <motion.span
                  key={`${item.handle}-bar`}
                  className="block h-full w-full origin-left rounded-full bg-background"
                  initial={reduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 4.8, ease: "linear" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </BlurFade>
  );
}
