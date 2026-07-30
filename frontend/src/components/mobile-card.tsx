"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}

export function MobileCard({ children, className, href, onClick }: MobileCardProps) {
  const base = cn(
    "bg-card border border-border rounded-xl p-4 transition-colors",
    (href || onClick) && "hover:border-primary/30 active:bg-muted/50 cursor-pointer",
    className
  );

  if (href) {
    return (
      <a href={href} className={base}>
        {children}
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={cn(base, "text-left w-full")}>
        {children}
      </button>
    );
  }

  return <div className={base}>{children}</div>;
}

interface MobileCardFieldProps {
  label: string;
  value: ReactNode;
  className?: string;
  mono?: boolean;
  truncate?: boolean;
}

export function MobileCardField({ label, value, className, mono, truncate }: MobileCardFieldProps) {
  if (!value) return null;
  return (
    <div className={cn("flex items-start justify-between gap-2 py-1", className)}>
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn(
        "text-xs text-right",
        mono && "font-mono uppercase",
        truncate && "truncate min-w-0"
      )}>
        {value}
      </span>
    </div>
  );
}

interface MobileCardActionsProps {
  children: ReactNode;
  className?: string;
}

export function MobileCardActions({ children, className }: MobileCardActionsProps) {
  return (
    <div className={cn("flex items-center gap-2 mt-3 pt-3 border-t border-border", className)}>
      {children}
    </div>
  );
}
