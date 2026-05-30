"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PopoverContextType {
  open: boolean;
  setOpen: (value: React.SetStateAction<boolean>) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const PopoverContext = React.createContext<PopoverContextType | undefined>(undefined);

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback((value: React.SetStateAction<boolean>) => {
    const nextOpen = typeof value === "function" ? (value as Function)(open) : value;
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    if (onOpenChange) {
      onOpenChange(nextOpen);
    }
  }, [controlledOpen, open, onOpenChange]);

  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  // Close when clicking outside
  React.useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        !target.closest('[data-popover-content="true"]')
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [open, setOpen]);

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const context = React.useContext(PopoverContext);
  if (!context) throw new Error("PopoverTrigger must be used inside Popover");

  const child = React.Children.only(children);

  return React.cloneElement(child as any, {
    ref: context.triggerRef,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      context.setOpen((prev) => !prev);
      if ((child as any).props.onClick) (child as any).props.onClick(e);
    },
  } as any);
}

export function PopoverContent({
  children,
  className,
  align = "center",
  side = "bottom",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
}) {
  const context = React.useContext(PopoverContext);
  if (!context) throw new Error("PopoverContent must be used inside Popover");

  if (!context.open) return null;

  return (
    <div
      data-popover-content="true"
      className={cn(
        "absolute z-50 w-72 rounded-lg border border-border bg-card p-4 text-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 duration-100",
        side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        side === "top"
          ? align === "end"
            ? "right-0 origin-bottom-right"
            : align === "start"
            ? "left-0 origin-bottom-left"
            : "left-1/2 -translate-x-1/2 origin-bottom"
          : align === "end"
          ? "right-0 origin-top-right"
          : align === "start"
          ? "left-0 origin-top-left"
          : "left-1/2 -translate-x-1/2 origin-top",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
