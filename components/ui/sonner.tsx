"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useDarkMode } from "@/hooks/use-dark-mode";

/**
 * Toasts follow the document class rather than a theme provider, matching the
 * no-provider theming used everywhere else in the app.
 */
const Toaster = (props: ToasterProps) => {
  const dark = useDarkMode();

  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      className="toaster group"
      position="bottom-right"
      offset={16}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border-transparent !bg-popover/95 !text-popover-foreground !backdrop-blur-xl !shadow-[inset_0_0_0_1px_var(--edge-line-strong),0_24px_48px_-16px_rgb(0_0_0/0.45)] !font-sans !text-sm !font-medium",
          title: "!font-runde !font-semibold !tracking-tight",
          description: "!text-muted-foreground !font-medium",
          actionButton:
            "!rounded-full !bg-primary !text-primary-foreground !font-semibold !text-xs !px-3 !h-7",
          cancelButton: "!rounded-full !bg-muted !text-foreground !font-semibold !text-xs !px-3 !h-7",
          closeButton: "!rounded-full !border-border !bg-popover",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
