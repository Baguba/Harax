"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { api } from "@/lib/client-api";
import { UserAvatar } from "@/components/common/user-avatar";
import { RoleBadge } from "@/components/common/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Palette,
  ScrollText,
  ShieldAlert,
  Loader2,
  Trash2,
  Sun,
  Moon,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "next-themes";

/** Settings — account, app preferences, legal links and the Play-required account deletion. */
export function SettingsView() {
  const { user, setUser, setView } = useAppStore();
  const qc = useQueryClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;
  const isSuperAdmin = user.role === "SUPERADMIN";

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const res = await api<{ deleted: boolean }>("/api/users/me", { method: "DELETE" });
    if (!res.ok) {
      toast.error(res.error ?? "Could not delete the account — try again.");
      setDeleting(false);
      return;
    }
    toast.success("Your account has been deleted. Goodbye — and good luck out there. 🌿");
    setUser(null);
    qc.clear();
    setDeleteOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-edge bg-lemon text-ink shadow-[0_3px_0_0_var(--bevel-lemon)]">
          <SettingsIcon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Settings</h1>
          <p className="text-xs font-bold text-muted-foreground">Your account, your rules.</p>
        </div>
      </div>

      {/* account card */}
      <section className="game-card rounded-3xl p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-extrabold">
          <UserIcon className="h-4 w-4" /> Account
        </h2>
        <div className="mt-4 flex items-center gap-4">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-bold leading-tight">{user.name}</p>
            <p className="truncate text-xs font-bold text-muted-foreground">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <RoleBadge role={user.role} />
              {user.verified && (
                <span className="text-[10px] font-bold text-muted-foreground">verified</span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-4 w-full rounded-2xl"
          onClick={() => setView({ name: "profile", id: user.id })}
        >
          Edit profile — photo, banner, department & bio
        </Button>
      </section>

      {/* app card */}
      <section className="game-card rounded-3xl p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-extrabold">
          <Palette className="h-4 w-4" /> Appearance
        </h2>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Theme</p>
            <p className="text-xs font-bold text-muted-foreground">
              {theme === "dark" ? "Dark mode — night owl hours" : "Light mode — campus daylight"}
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 rounded-2xl"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Switch
          </Button>
        </div>
      </section>

      {/* legal card */}
      <section className="game-card rounded-3xl p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-extrabold">
          <ScrollText className="h-4 w-4" /> Legal
        </h2>
        <p className="mt-2 text-xs font-bold text-muted-foreground">
          The rules of the playground, in plain language.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full justify-between rounded-2xl">
              Privacy policy <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full justify-between rounded-2xl">
              Terms of service <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </section>

      {/* danger zone */}
      <section className="rounded-3xl border-2 border-red-300 bg-red-50/60 p-5 dark:border-red-500/40 dark:bg-red-500/5">
        <h2 className="flex items-center gap-2 font-display text-base font-extrabold text-red-700 dark:text-red-300">
          <ShieldAlert className="h-4 w-4" /> Danger zone
        </h2>
        <p className="mt-2 text-xs font-bold leading-relaxed text-red-900/70 dark:text-red-200/70">
          Deleting your account erases your profile, photos, posts, comments, sidechat messages and
          Game Zone records — permanently. There is no undo. Think it over.
        </p>
        {isSuperAdmin ? (
          <p className="mt-4 rounded-2xl border-2 border-red-300/70 bg-card p-3 text-xs font-bold text-muted-foreground dark:border-red-500/30">
            You are signed in as the super admin — this account keeps the platform running, so it
            cannot delete itself. Promote another admin first if you need to hand it over.
          </p>
        ) : (
          <Button
            variant="destructive"
            className="mt-4 gap-2 rounded-2xl"
            onClick={() => {
              setConfirmText("");
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete my account
          </Button>
        )}
      </section>

      {/* delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes everything — your profile, photos, posts, comments, messages and game
              history — <strong>forever</strong>. Other members will no longer see anything you
              shared. If you are sure, type <strong>DELETE</strong> below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            autoComplete="off"
            aria-label="Type DELETE to confirm account deletion"
            disabled={deleting}
            className="mt-2"
          />
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Keep my account
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Delete forever
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
