import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * Pill button.
 *
 * Transitions colour properties only, never transform, so nothing in the
 * chrome ever bounces. Alpha hovers (`foreground/[0.045]`) rather than flat
 * greys are the tell of this design language.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2",
    "rounded-full border text-sm font-semibold whitespace-nowrap",
    "transition-[background-color,border-color,color,opacity,box-shadow] duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary text-primary-foreground shadow-primary-inset hover:border-primary/90 hover:bg-primary/80",
        secondary:
          "border-border bg-popover text-foreground hover:border-ring hover:bg-muted dark:bg-muted dark:hover:bg-popover",
        outline:
          "border-border bg-transparent text-foreground shadow-none hover:bg-foreground/[0.045]",
        ghost:
          "border-transparent bg-transparent text-foreground/70 shadow-none hover:bg-foreground/[0.055] hover:text-foreground",
        danger:
          "border-destructive bg-destructive text-destructive-foreground hover:border-destructive/90 hover:bg-destructive/90",
        subtle:
          "border-transparent bg-muted/70 text-foreground shadow-none hover:bg-foreground/[0.075]",
      },
      size: {
        xs: "h-7 gap-1.5 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 px-3.5 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        xl: "h-12 px-6 text-base",
        icon: "h-9 w-9 p-0",
        "icon-xs": "h-7 w-7 p-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonBaseProps = VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
  className?: string;
};

type ButtonProps = ButtonBaseProps &
  Omit<React.ComponentPropsWithoutRef<"button">, "color"> & {
    href?: undefined;
  };

type ButtonLinkProps = ButtonBaseProps &
  Omit<React.ComponentPropsWithoutRef<typeof Link>, "href"> & {
    href: string;
  };

/** Polymorphic: pass `href` and it renders a `next/link`, otherwise a `<button>`. */
function Button(props: ButtonProps | ButtonLinkProps) {
  const { className, variant, size, asChild, ...rest } = props as ButtonBaseProps &
    Record<string, unknown>;
  const classes = cn(buttonVariants({ variant, size, className }));

  if (asChild) {
    return <Slot.Root data-slot="button" className={classes} {...rest} />;
  }

  if (typeof rest.href === "string") {
    return <Link data-slot="button" className={classes} {...(rest as unknown as React.ComponentProps<typeof Link>)} />;
  }

  const buttonProps = rest as React.ComponentPropsWithoutRef<"button">;
  return (
    <button data-slot="button" type={buttonProps.type ?? "button"} className={classes} {...buttonProps} />
  );
}

export { Button, buttonVariants };
export type { ButtonProps, ButtonLinkProps };
