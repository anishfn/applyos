"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * The month grid behind every date field.
 *
 * Styled from the app's own tokens rather than the library's stylesheet: pill
 * day cells, one lime selection, and the same hover language as the rest of the
 * chrome.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "relative",
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "font-runde text-sm font-semibold tracking-tight",
        nav: "absolute inset-x-0 top-3 flex items-center justify-between px-3",
        button_previous: cn(
          "inline-flex size-7 cursor-pointer items-center justify-center rounded-full",
          "text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-30",
        ),
        button_next: cn(
          "inline-flex size-7 cursor-pointer items-center justify-center rounded-full",
          "text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-30",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-[11px] font-medium text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "size-9 p-0 text-center",
        day_button: cn(
          "inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-sm font-medium",
          "transition-colors duration-150 hover:bg-foreground/[0.06]",
          "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        today: "[&>button]:font-semibold [&>button]:text-primary",
        outside: "[&>button]:text-muted-foreground/40",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...rest} />
          ) : (
            <ChevronRight className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
