"use client";

import * as React from "react";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

/** How much fixed navbar an anchored section has to clear. */
const NAV_CLEARANCE = 96;

/**
 * Smooth in-page anchors, animated rather than delegated to CSS.
 *
 * `scroll-behavior: smooth` is the easy version of this, but it fights
 * scroll-linked animation: the browser owns an interpolation that GSAP is
 * simultaneously reading from, and long jumps stutter. Driving the scroll
 * ourselves also lets the target clear the fixed navbar exactly, instead of
 * depending on a scroll-margin on every section.
 */
export function AnchorScroll() {
  React.useEffect(() => {
    gsap.registerPlugin(ScrollToPlugin);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const link = (event.target as HTMLElement | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
      const href = link?.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!(target instanceof HTMLElement)) return;

      event.preventDefault();
      const y = Math.max(0, target.getBoundingClientRect().top + window.scrollY - NAV_CLEARANCE);
      history.replaceState(null, "", href);

      if (reduced) {
        window.scrollTo(0, y);
        return;
      }

      // autoKill would be the obvious way to let a reader interrupt the tween,
      // but it also fires on the scroll-anchoring nudges the browser makes when
      // content above the viewport finishes animating, which strands the jump a
      // few pixels short. Watch for real input instead.
      const tween = gsap.to(window, { scrollTo: { y, autoKill: false }, duration: 0.7, ease: "power2.inOut" });
      const interrupt = () => tween.kill();
      const stop = () => {
        window.removeEventListener("wheel", interrupt);
        window.removeEventListener("touchstart", interrupt);
        window.removeEventListener("keydown", interrupt);
      };
      window.addEventListener("wheel", interrupt, { passive: true, once: true });
      window.addEventListener("touchstart", interrupt, { passive: true, once: true });
      window.addEventListener("keydown", interrupt, { once: true });
      tween.eventCallback("onComplete", stop);
      tween.eventCallback("onInterrupt", stop);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
