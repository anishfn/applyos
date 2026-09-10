import { Database, GitFork, Lock, Sparkles } from "@/components/ui/icons";
import { CopyCommand } from "@/components/marketing/copy-command";
import { BlurFade } from "@/components/marketing/blur-fade";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POINTS = [
  {
    icon: Lock,
    title: "Nothing to set up",
    body: "Open it and start typing. Your workspace lives in this browser and never leaves it unless you say so.",
  },
  {
    icon: Database,
    title: "Your database, if you want one",
    body: "Add two lines to a file and the same workspace moves to a Postgres you own. The migration ships in the repo.",
  },
  {
    icon: GitFork,
    title: "Fork it and change it",
    body: "Rename the stages, add a field, delete the parts you never use. It's a codebase, not a subscription.",
  },
  {
    icon: Sparkles,
    title: "AI only if you want it",
    body: "The hook is there and nothing is plugged into it. No key is needed, ever, unless you decide to add one.",
  },
];

export function OpenSource() {
  return (
    <section id="open-source" className="scroll-mt-24 px-5 pt-20 sm:px-6 sm:pt-24 md:px-8 lg:pt-28">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-12">
          <BlurFade inView className="md:col-span-5">
            <div
              className="flex h-full flex-col justify-center gap-8 overflow-hidden rounded-2xl bg-foreground p-6 text-background"
              style={{ cornerShape: "squircle" } as React.CSSProperties}
            >
              <div>
                <h2 className="font-runde text-3xl font-semibold tracking-tight sm:text-4xl">
                  It&rsquo;s yours. Really yours.
                </h2>
                <p className="mt-3 text-sm leading-6 font-medium text-background/70">
                  A job search is a pile of private notes about a hard moment in your life. It shouldn&rsquo;t sit on someone else&rsquo;s server just because a product wanted your email
                  address.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                  <Button
                    href="https://github.com/anishfn/applyos"
                    target="_blank"
                    rel="noreferrer noopener"
                    variant="primary"
                    size="md"
                    className="w-full"
                  >
                    <GitFork className="size-4" />
                    Fork it on GitHub
                  </Button>
                  <Button
                    href="/app"
                    variant="outline"
                    size="md"
                    className="w-full border-background/25 text-background hover:bg-background/10"
                  >
                    Try it first
                  </Button>
              </div>
            </div>
          </BlurFade>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 md:col-span-7">
            {POINTS.map((point, index) => {
              const Icon = point.icon;
              return (
                <BlurFade
                  key={point.title}
                  inView
                  delay={index * 0.06}
                  className={cn(
                    "rounded-2xl bg-card p-5 edge",
                    "transition-colors duration-200 ease-out hover:bg-muted/70 motion-reduce:transition-none",
                  )}
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary-ink">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="mt-4 font-runde text-base font-semibold tracking-tight">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 font-medium text-muted-foreground">
                    {point.body}
                  </p>
                </BlurFade>
              );
            })}
          </div>
        </div>

        <BlurFade inView>
          <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl bg-card p-5 edge sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h3 className="font-runde text-sm font-semibold tracking-tight">
                Running it yourself takes one command
              </h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Bun, Next.js and Tailwind. There&rsquo;s nothing to configure before it works.
              </p>
            </div>
            <CopyCommand command="bun install && bun dev" />
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
