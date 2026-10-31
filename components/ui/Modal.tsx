"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Surface } from "./Surface";

/**
 * Modal / Dialog — accessible overlay dialog with blurred backdrop, Escape handling, animated entry.
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  footer?: React.ReactNode;
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full animate-rise",
          sizeClasses[size]
        )}
      >
        <Surface variant="elevated" rounded="2xl" padding="none" className="overflow-hidden">
          {(title || description) && (
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="space-y-1">
                {title && (
                  <h3 className="text-lg font-semibold tracking-tight text-ink">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-sm text-mute">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="shrink-0 rounded-lg p-1.5 text-mute transition-colors hover:bg-mist hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-line bg-mist/60 px-6 py-4">
              {footer}
            </div>
          )}
        </Surface>
      </div>
    </div>
  );
}

export default Modal;
