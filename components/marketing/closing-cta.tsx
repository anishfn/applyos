import { ArrowRight } from "@/components/ui/icons";
import { BlurFade } from "@/components/marketing/blur-fade";
import { Button } from "@/components/ui/button";

export function ClosingCta() {
  return (
    <section className="px-5 pt-16 sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <BlurFade inView>
          <div
            className="relative flex flex-col items-center overflow-hidden rounded-3xl bg-card px-6 py-14 text-center edge"
            style={{ cornerShape: "squircle" } as React.CSSProperties}
          >
            {/* One soft pool of brand colour, nothing else. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-40 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-primary/[0.09] blur-[110px]"
            />

            <h2 className="relative max-w-lg font-runde text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              Ready when you are
            </h2>
            <p className="relative mt-3 max-w-sm text-sm leading-6 font-medium text-muted-foreground">
              No account, no install, no trial. It works the second the page loads, and your first
              job takes about ten seconds.
            </p>

            <div className="relative mt-7 flex flex-col items-center gap-3 sm:flex-row">
              <Button href="/app" variant="primary" size="lg" className="group">
                Open ApplyOS
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
              <Button
                href="https://github.com/anishfn/applyos"
                target="_blank"
                rel="noreferrer noopener"
                variant="secondary"
                size="lg"
              >
                Read the code
              </Button>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
