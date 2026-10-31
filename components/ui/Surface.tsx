import React from "react";
import { cn } from "@/lib/utils";

/**
 * Surface — universal foundation for cards, dialogs, timeline nodes, and panels.
 * Enforces consistent radii, borders, elevation, and shadow.
 */

type SurfaceTag = "div" | "section" | "article" | "aside" | "header";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: SurfaceTag;
  variant?:
    | "default"
    | "glass-dark"
    | "glass-light"
    | "elevated"
    | "outline"
    | "glow-emerald"
    | "glow-cyan";
  interactive?: boolean;
  glowOnHover?: boolean;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  children?: React.ReactNode;
}

const variantClasses: Record<NonNullable<SurfaceProps["variant"]>, string> = {
  default: "card",
  "glass-dark": "panel-night border border-white/[0.08]",
  "glass-light": "bg-white/90 backdrop-blur-sm border border-line",
  elevated: "card shadow-lift",
  outline: "bg-transparent border border-line",
  "glow-emerald": "card border-ok/25 shadow-[0_8px_24px_-12px_rgba(21,128,61,0.35)]",
  "glow-cyan": "card border-accent/25 shadow-[0_8px_24px_-12px_rgba(37,99,235,0.35)]",
};

const paddingClasses: Record<NonNullable<SurfaceProps["padding"]>, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
  xl: "p-10",
};

const roundedClasses: Record<NonNullable<SurfaceProps["rounded"]>, string> = {
  none: "",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
};

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  (
    {
      as = "div",
      variant = "default",
      interactive = false,
      glowOnHover = false,
      padding = "md",
      rounded = "2xl",
      className,
      children,
      ...rest
    },
    ref
  ) => {
    const Tag = as as React.ElementType;
    return React.createElement(
      Tag,
      {
        ref,
        className: cn(
          "relative transition-all duration-200 ease-out",
          variantClasses[variant],
          paddingClasses[padding],
          roundedClasses[rounded],
          interactive &&
            "cursor-pointer hover:-translate-y-0.5 hover:shadow-lift hover:border-line-strong",
          glowOnHover &&
            "hover:shadow-lift hover:border-accent/40",
          className
        ),
        ...rest,
      },
      children
    );
  }
);

Surface.displayName = "Surface";
export default Surface;
