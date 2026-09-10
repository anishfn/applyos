"use client";

import { ChevronDown } from "@/components/ui/icons";
import { Accordion } from "radix-ui";
import { BlurFade } from "@/components/marketing/blur-fade";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    q: "Do I need an account?",
    a: "No. There's no sign-up and no server. Open the app and your workspace is created right there in your browser. If you want it on more than one device later, point it at your own Supabase project and everything moves across.",
  },
  {
    q: "Where does my data actually live?",
    a: "In this browser, in IndexedDB, until you decide otherwise. Nothing is sent anywhere. With Supabase configured it lives in a Postgres database you own. Either way you can export the lot as JSON or CSV whenever you like.",
  },
  {
    q: "How does pasting a link work?",
    a: "Job links are more structured than they look. Greenhouse, Lever, Ashby, Workable, SmartRecruiters, LinkedIn, Indeed and most careers pages all put the company, and usually the role, right in the address. ApplyOS reads it locally, with no network request. Anything it can't work out, you type.",
  },
  {
    q: "Can I trust the fit score?",
    a: "It's honest rather than clever. Skills, experience, location, salary, role and company, each a simple ratio you can open up and check. If your profile is too thin to say anything useful, it says nothing at all instead of guessing.",
  },
  {
    q: "What about the AI features?",
    a: "There's a documented place to plug a model in, and nothing is plugged in. No key is required to use any part of the app. Resume feedback, job description summaries and draft follow-ups are optional add-ons, not the product.",
  },
  {
    q: "Can I change the pipeline stages?",
    a: "Yes. They are a plain list in lib/constants.ts with their labels and colours. Add one, rename one, delete one, and the board, the funnel and the analytics all follow along.",
  },
];

export function Faq() {
  return (
    <section className="px-5 pt-20 pb-4 sm:px-6 sm:pt-24 md:px-8 lg:pt-28">
      <div className="mx-auto w-full max-w-3xl">
        <BlurFade inView>
          <h2 className="font-runde text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            Fair questions
          </h2>
        </BlurFade>

        <BlurFade inView y={8} delay={0.06}>
          <Accordion.Root type="single" collapsible className="mt-8 flex flex-col gap-2">
            {ITEMS.map((item) => (
              <Accordion.Item
                key={item.q}
                value={item.q}
                className={cn(
                  "rounded-2xl border-0 bg-card px-4 edge",
                  "transition-colors duration-300 ease-out hover:bg-muted/70 data-[state=open]:bg-popover/85",
                )}
              >
                <Accordion.Header>
                  <Accordion.Trigger
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left",
                      "font-runde text-sm font-semibold tracking-tight",
                      "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                      "[&[data-state=open]>svg]:rotate-180",
                    )}
                  >
                    {item.q}
                    <ChevronDown className="size-4 shrink-0 text-primary transition-transform duration-200" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <p className="pb-4 text-sm leading-6 font-medium text-muted-foreground">
                    {item.a}
                  </p>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </BlurFade>
      </div>
    </section>
  );
}
