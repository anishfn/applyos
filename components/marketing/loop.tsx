"use client";

import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  FileText,
  Handshake,
  Send,
  SquareKanban,
  Target,
  Video,
} from "@/components/ui/icons";
import { BlurFade } from "@/components/marketing/blur-fade";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Bookmark, label: "Save it", detail: "Park the link while you think" },
  { icon: Target, label: "Check the fit", detail: "See the gaps before you apply" },
  { icon: FileText, label: "Apply", detail: "Ten seconds, resume attached" },
  { icon: SquareKanban, label: "Track it", detail: "One drag moves it along" },
  { icon: Send, label: "Follow up", detail: "Written today, sent next week" },
  { icon: Video, label: "Interview", detail: "Prep sits on the round itself" },
  { icon: Handshake, label: "Offer", detail: "Decision date front and centre" },
  { icon: CheckCircle2, label: "Accept", detail: "And proof of what worked" },
];

export function Loop() {


  return (
    <section id="loop" className="scroll-mt-24 px-5 pt-20 sm:px-6 sm:pt-24 md:px-8 lg:pt-28">
      <div className="mx-auto w-full max-w-5xl">
        <BlurFade inView>
          <h2 className="font-runde text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            How it goes, start to finish
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 font-medium text-muted-foreground">
            Every screen exists to make one of these eight steps quicker. Nothing else made it in.
          </p>
        </BlurFade>

        <ol className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const last = index === STEPS.length - 1;
            return (
              <BlurFade
                key={step.label}
                inView
                delay={index * 0.05}
                y={14}
                className={cn(
                  "list-none",
                  "group relative flex items-start gap-3 rounded-2xl bg-card p-4 edge",
                  "transition-colors duration-200 ease-out hover:bg-muted/70 motion-reduce:transition-none",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                    last
                      ? "bg-primary text-primary-foreground"
                      : "bg-foreground/[0.05] text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-runde text-sm font-semibold tracking-tight">{step.label}</h3>
                  </div>
                  <p className="mt-0.5 text-xs leading-5 font-medium text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
                {!last && (
                  <ArrowRight
                    aria-hidden
                    className="absolute top-1/2 -right-1.5 hidden size-3 -translate-y-1/2 text-foreground/15 lg:block"
                  />
                )}
              </BlurFade>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
