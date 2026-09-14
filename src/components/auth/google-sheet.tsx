"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/common/user-avatar";
import { api } from "@/lib/client-api";
import type { SessionUser } from "@/lib/types";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

const DEMO_GOOGLE_ACCOUNTS = [
  { email: "abebe.k@gmail.com", name: "Abebe Kebede", subtitle: "abebe.k@gmail.com" },
  { email: "meseret.t@gmail.com", name: "Meseret Tola", subtitle: "meseret.t@gmail.com" },
];

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

/**
 * Google account chooser sheet (demo mode).
 * In production this is replaced by a real OAuth redirect; the account
 * linking + session flow on the server stays identical.
 */
export function GoogleSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: (user: SessionUser) => void;
}) {
  const [mode, setMode] = useState<"choose" | "custom">("choose");
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [customRole, setCustomRole] = useState<"STUDENT" | "LECTURER">("STUDENT");

  const choose = async (email: string, name: string) => {
    setLoadingEmail(email);
    const res = await api<{ user: SessionUser }>("/api/auth/google", {
      body: { email, name, role: "STUDENT" },
    });
    setLoadingEmail(null);
    if (!res.ok) return toast.error(res.error);
    onOpenChange(false);
    onSuccess(res.data.user);
  };

  const custom = async () => {
    if (!customEmail.includes("@") || customName.trim().length < 2) {
      return toast.error("Enter your name and a valid email.");
    }
    await choose(customEmail.trim().toLowerCase(), customName.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setMode("choose"); onOpenChange(v); }}>
      <DialogContent className="max-w-[400px] rounded-3xl p-0">
        <div className="flex flex-col items-center border-b-2 border-edge px-6 pb-5 pt-8 text-center">
          <GoogleIcon className="h-9 w-9" />
          <DialogTitle className="mt-4 font-display text-xl font-semibold">Sign in with Google</DialogTitle>
          <DialogDescription className="mt-1 text-xs text-muted-foreground">
            to continue to <span className="font-semibold text-foreground">Harax</span>
          </DialogDescription>
        </div>

        <div className="max-h-[52svh] overflow-y-auto px-3 py-3 nice-scrollbar">
          {mode === "choose" ? (
            <div className="space-y-1">
              {DEMO_GOOGLE_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => choose(acc.email, acc.name)}
                  disabled={loadingEmail !== null}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <UserAvatar user={{ name: acc.name, avatarUrl: null }} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{acc.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{acc.subtitle}</span>
                  </span>
                  {loadingEmail === acc.email && <Loader2 className="h-5 w-5 animate-spin text-lemon" />}
                </button>
              ))}
              <button
                onClick={() => setMode("custom")}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </span>
                <span className="text-sm font-bold">Use another account</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 px-2 pb-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setMode("choose")} className="gap-1.5 rounded-xl px-3">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div className="space-y-2">
                <label className="text-xs font-bold" htmlFor="g-name">Full name</label>
                <Input id="g-name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Kalkidan Bekele" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold" htmlFor="g-email">Email</label>
                <Input id="g-email" type="email" value={customEmail} onChange={(e) => setCustomEmail(e.target.value)} placeholder="you@gmail.com" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["STUDENT", "LECTURER"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCustomRole(r)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${customRole === r ? "border-lemon bg-lemon/15 text-lime-800 dark:text-lime-300" : "hover:border-lemon/50"}`}
                  >
                    {r === "STUDENT" ? "🎓 Student" : "👩‍🏫 Lecturer"}
                  </button>
                ))}
              </div>
              <Button onClick={custom} disabled={loadingEmail !== null} className="w-full rounded-2xl font-semibold">
                {loadingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </Button>
            </div>
          )}
        </div>

        <p className="border-t-2 border-edge px-6 py-3 text-center text-[10px] leading-relaxed text-muted-foreground">
          Sandbox demo mode — accounts are created instantly on Harax.
          In production this dialog is the real Google OAuth flow.
        </p>
      </DialogContent>
    </Dialog>
  );
}
