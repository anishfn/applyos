import type { Metadata } from "next";
import { AnchorScroll } from "@/components/marketing/anchor-scroll";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { Bento } from "@/components/marketing/bento";
import { Loop } from "@/components/marketing/loop";
import { OpenSource } from "@/components/marketing/open-source";
import { Faq } from "@/components/marketing/faq";
import { ClosingCta } from "@/components/marketing/closing-cta";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "ApplyOS, the easy way to run your job search",
  description:
    "Paste a job link and it is saved. Keep every application, interview and follow-up in one place, and always know the one thing to do next. Free, open source, no account.",
};

export default function LandingPage() {
  return (
    <>
      <AnchorScroll />
      <MarketingNavbar />
      <main className="min-h-screen [overflow-x:clip]">
        <Hero />
        <Bento />
        <Loop />
        <OpenSource />
        <Faq />
        <ClosingCta />
      </main>
      <MarketingFooter />
    </>
  );
}
