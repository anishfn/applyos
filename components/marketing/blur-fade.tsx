"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

/**
 * The entrance register for the marketing page.
 *
 * Content resolves rather than arrives: a short blur clears while opacity comes
 * up and the element settles a few pixels. Nothing travels far, because a
 * landing page that throws its content around is harder to read, not more
 * impressive.
 *
 * `inView` defers until the element is nearly on screen, which is what
 * everything below the fold wants. Above the fold, leave it off and stagger with
 * `delay` so the hero resolves top to bottom on load.
 *
 * It renders one plain div, so it can *be* the card it animates rather than
 * wrapping it. That matters inside a grid: a wrapper would become the grid item.
 */
export function BlurFade({
  children,
  className,
  style,
  delay = 0,
  duration = 0.6,
  y = 10,
  blur = 8,
  inView = false,
  once = true,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  duration?: number;
  /** Distance to rise from. Small on purpose. */
  y?: number;
  /** Starting blur radius, in px. */
  blur?: number;
  inView?: boolean;
  once?: boolean;
  id?: string;
}) {
  const reduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  // The negative margin starts things before they are fully exposed, so the page
  // reads as settling rather than popping in late.
  const seen = useInView(ref, { once, margin: "-64px 0px -64px 0px" });
  const play = inView ? seen : true;

  /**
   * Reduced motion changes the props, never the element.
   *
   * Swapping to a plain div here looked equivalent and was not: the server
   * renders the motion element with its `initial` styles inline, and React
   * hydration does not scrub attributes off matched markup, so the blurred,
   * transparent styles stayed on the node forever. Keeping the motion element
   * and dropping `initial` lets Motion write the resolved styles on mount.
   */
  const settled = { opacity: 1, y: 0, filter: "blur(0px)" };

  return (
    <motion.div
      ref={ref}
      id={id}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y, filter: `blur(${blur}px)` }}
      animate={reduceMotion || play ? settled : undefined}
      transition={reduceMotion ? { duration: 0 } : { duration, delay, ease: [0.16, 1, 0.3, 1] }}
      // Promoting for the length of the animation is much cheaper than letting
      // the browser rediscover the layer on every blurred frame.
      style={reduceMotion ? style : { willChange: "opacity, filter, transform", ...style }}
      onAnimationComplete={() => {
        if (ref.current) ref.current.style.willChange = "auto";
      }}
    >
      {children}
    </motion.div>
  );
}
