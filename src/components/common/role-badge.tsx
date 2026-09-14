"use client";

import { BadgeCheck, GraduationCap, Shield, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  STUDENT: { label: "Student", icon: User, className: "bg-secondary text-secondary-foreground border-edge" },
  LECTURER: { label: "Lecturer", icon: GraduationCap, className: "bg-lemon text-ink border-ink" },
  ADMIN: { label: "Admin", icon: Shield, className: "bg-amber-300 text-amber-950 border-amber-800" },
  SUPERADMIN: { label: "Super Admin", icon: ShieldCheck, className: "bg-red-400 text-red-950 border-red-900" },
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.STUDENT;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide shadow-[0_2px_0_0_rgba(12,17,11,0.25)]",
        cfg.className,
        className
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.75} />
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
