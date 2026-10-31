import React from "react";
import { cn } from "@/lib/utils";

/**
 * SkeletonLoader — component.md §1.8
 * Shimmering animated placeholders for async DB/blockchain queries.
 */

export interface SkeletonLoaderProps {
  className?: string;
  variant?: "text" | "rect" | "circle";
  width?: string | number;
  height?: string | number;
}

export function SkeletonLoader({
  className,
  variant = "rect",
  width,
  height,
}: SkeletonLoaderProps) {
  const style: React.CSSProperties = {
    width: width ?? undefined,
    height: height ?? undefined,
  };
  return (
    <div
      className={cn(
        "vera-skeleton",
        variant === "text" && "h-4 rounded-md",
        variant === "rect" && "rounded-xl",
        variant === "circle" && "rounded-full",
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          variant="text"
          className={i === lines - 1 ? "w-2/3" : "w-full"}
        />
      ))}
    </div>
  );
}

export default SkeletonLoader;
