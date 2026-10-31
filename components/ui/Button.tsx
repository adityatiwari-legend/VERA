import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * Button — accessible action button with loading states, icon support, and tactile feedback.
 */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "glow"
    | "subtle";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-white border border-accent hover:bg-accent-deep hover:border-accent-deep",
  secondary:
    "bg-white text-ink border border-line hover:bg-mist hover:border-line-strong",
  outline:
    "bg-transparent text-accent border border-accent/40 hover:border-accent hover:bg-accent-faint",
  ghost:
    "bg-transparent text-mute border border-transparent hover:bg-mist hover:text-ink",
  danger:
    "bg-bad text-white border border-bad hover:bg-bad/90",
  glow:
    "bg-accent text-white border border-accent shadow-[0_8px_20px_-8px_rgba(37,99,235,0.5)] hover:bg-accent-deep",
  subtle:
    "bg-mist text-ink border border-line hover:bg-accent-faint hover:border-accent/25",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  xs: "px-2.5 py-1 text-[10px] gap-1",
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-6 py-3.5 text-base gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg",
          "transition-all duration-150 ease-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98]",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...rest}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{loadingText ?? "Processing"}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
