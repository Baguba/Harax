"use client";

import { BadgeCheck, GraduationCap, Shield, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  STUDENT: { label: "Student", icon: User, className: "bg-secondary text-secondary-foreground border-border" },
  LECTURER: { label: "Lecturer", icon: GraduationCap, className: "bg-lemon/20 text-lime-800 dark:text-lime-300 border-lemon/40" },
  ADMIN: { label: "Admin", icon: Shield, className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border-amber-300/50" },
  SUPERADMIN: { label: "Super Admin", icon: ShieldCheck, className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 border-red-300/50" },
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.STUDENT;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        cfg.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck
      className={cn("h-4 w-4 text-lime-600 dark:text-lime-400", className)}
      aria-label="Verified account"
    />
  );
}
