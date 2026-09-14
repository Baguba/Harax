"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HaraxLogo } from "@/components/common/harax-logo";
import { UserAvatar } from "@/components/common/user-avatar";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User, Users, GraduationCap, ArrowLeft } from "lucide-react";
import { api } from "@/lib/client-api";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import { DEPARTMENTS, YEARS } from "@/lib/validation-constants";
import { GoogleSheet } from "@/components/auth/google-sheet";

const DEMO_ACCOUNTS = [
  { label: "Student", email: "selam.awoke@gmail.com", name: "Selam Awoke", hint: "CS · 3rd Year" },
  { label: "Lecturer", email: "dr.meron@haramaya.edu.et", name: "Dr. Meron Tadesse", hint: "Computer Science" },
  { label: "Admin", email: "registrar@haramaya.edu.et", name: "Registrar Office", hint: "Announcements" },
  { label: "Super Admin", email: "ict.office@haramaya.edu.et", name: "ICT Office", hint: "Full control" },
];
const DEMO_PASSWORD = "harax2026";

function VisuallyHiddenTitle() {
  return (
    <DialogTitle className="sr-only">Sign in or create your Harax account</DialogTitle>
  );
}

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

export function AuthModal() {
  const { authOpen, authMode, setAuthMode, closeAuth, setUser, setView } = useAppStore();
  const [googleOpen, setGoogleOpen] = useState(false);

  return (
    <>
      <Dialog open={authOpen} onOpenChange={(v) => !v && closeAuth()}>
        <DialogContent className="max-h-[92svh] overflow-y-auto rounded-3xl p-0 sm:max-w-[460px] nice-scrollbar">
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lemon/20 blur-3xl" />
            <div className="relative p-6 sm:p-8">
              <DialogHeader className="mb-2 text-left">
                <VisuallyHiddenTitle />
                <HaraxLogo size={40} className="mb-4 justify-center sm:justify-start" />
                <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "login" | "register")}>
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1">
                    <TabsTrigger value="login" className="rounded-xl font-semibold">Sign in</TabsTrigger>
                    <TabsTrigger value="register" className="rounded-xl font-semibold">Create account</TabsTrigger>
                  </TabsList>
                  <TabsContent value="login" className="mt-5">
                    <LoginPanel />
                  </TabsContent>
                  <TabsContent value="register" className="mt-5">
                    <RegisterPanel />
                  </TabsContent>
                </Tabs>

                <button
                  onClick={() => setGoogleOpen(true)}
                  className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-edge bg-card px-4 py-3.5 font-display text-sm font-bold shadow-[0_4px_0_0_var(--edge-soft)] transition-all hover:bg-secondary active:translate-y-[3px] active:shadow-none"
                >
                  <GoogleIcon className="h-5 w-5" />
                  Continue with Google
                </button>

                <div className="game-inset mt-6 border-dashed p-4">
                  <p className="mb-3 flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wide text-lime-800 dark:text-lime-300">
                    <Users className="h-3.5 w-3.5" /> Demo accounts — 1-click
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <DemoChip key={acc.email} account={acc} />
                    ))}
                  </div>
                </div>
              </DialogHeader>
              <DialogDescription className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                By continuing you agree to keep Harax kind & safe — it's our campus home.
                <br />
                Students, lecturers & staff of Haramaya University only.
              </DialogDescription>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GoogleSheet
        open={googleOpen}
        onOpenChange={setGoogleOpen}
        onSuccess={(user) => {
          setUser(user);
          setView({ name: "feed" });
          toast.success(`Welcome, ${user.name.split(" ")[0]}!`, { description: "Signed in with Google." });
        }}
      />
    </>
  );
}

function DemoChip({ account }: { account: (typeof DEMO_ACCOUNTS)[number] }) {
  const { closeAuth, setUser, setView } = useAppStore();
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    const res = await api<{ user: import("@/lib/types").SessionUser }>("/api/auth/login", {
      body: { email: account.email, password: DEMO_PASSWORD },
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    setUser(res.data.user);
    setView({ name: "feed" });
    closeAuth();
    toast.success(`Welcome back, ${res.data.user.name.split(" ")[0]}!`);
  };

  return (
    <button
      onClick={login}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl border-2 border-edge bg-card px-2.5 py-2 text-left font-semibold shadow-[0_3px_0_0_var(--edge-soft)] transition-all hover:bg-secondary active:translate-y-[2px] active:shadow-none disabled:opacity-60"
    >
      <UserAvatar user={{ name: account.name, avatarUrl: null }} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-bold leading-tight">{account.label}</span>
        <span className="block truncate text-[9px] text-muted-foreground leading-tight">{account.hint}</span>
      </span>
      {loading && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-lemon" />}
    </button>
  );
}

function LoginPanel() {
  const { closeAuth, setUser, setView } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api<{ user: import("@/lib/types").SessionUser }>("/api/auth/login", {
      body: { email, password },
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    setUser(res.data.user);
    setView({ name: "feed" });
    closeAuth();
    toast.success(`Welcome back, ${res.data.user.name.split(" ")[0]}!`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email" className="text-xs font-bold">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="login-email" type="email" required autoComplete="email" placeholder="you@haramaya.edu.et"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl pl-10" disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password" className="text-xs font-bold">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="login-password" type={show ? "text" : "password"} required autoComplete="current-password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl pl-10 pr-10" disabled={loading}
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl text-base text-game-caps">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in to Harax"}
      </Button>
    </form>
  );
}

function RegisterPanel() {
  const { closeAuth, setUser, setView } = useAppStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "LECTURER">("STUDENT");
  const [department, setDepartment] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ["Too weak", "Weak", "Okay", "Strong", "Excellent"][strength];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api<{ user: import("@/lib/types").SessionUser }>("/api/auth/register", {
      body: {
        name, email, password, role,
        department: department || undefined,
        year: role === "STUDENT" ? year || undefined : undefined,
      },
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    setUser(res.data.user);
    setView({ name: "feed" });
    closeAuth();
    toast.success(`Welcome to Harax, ${res.data.user.name.split(" ")[0]}!`, {
      description: "Post your first update or join a group to get started.",
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="reg-name" className="text-xs font-bold">Full name</Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="reg-name" required minLength={2} placeholder="e.g. Selam Awoke" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl pl-10" disabled={loading} />
          </div>
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="reg-email" className="text-xs font-bold">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="reg-email" type="email" required placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl pl-10" disabled={loading} />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold">I am a</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button" onClick={() => setRole("STUDENT")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${role === "STUDENT" ? "border-ink bg-lemon text-ink shadow-[0_3px_0_0_var(--bevel-lemon)]" : "border-edge hover:bg-secondary"}`}
            >
              <GraduationCap className="h-4 w-4" /> Student
            </button>
            <button
              type="button" onClick={() => setRole("LECTURER")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${role === "LECTURER" ? "border-ink bg-lemon text-ink shadow-[0_3px_0_0_var(--bevel-lemon)]" : "border-edge hover:bg-secondary"}`}
            >
              <ShieldCheck className="h-4 w-4" /> Lecturer
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold">{role === "STUDENT" ? "Year" : " "}</Label>
          <Select value={year} onValueChange={setYear} disabled={loading || role !== "STUDENT"}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label className="text-xs font-bold">Department</Label>
          <Select value={department} onValueChange={setDepartment} disabled={loading}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose your department" /></SelectTrigger>
            <SelectContent className="max-h-60 nice-scrollbar">
              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="reg-password" className="text-xs font-bold">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="reg-password" type={show ? "text" : "password"} required minLength={8} placeholder="Min 8 chars, Aa + number" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl pl-10 pr-10" disabled={loading} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <div className="flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1 overflow-hidden rounded-full">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-full flex-1 rounded-full transition-colors ${i < strength ? (strength <= 1 ? "bg-red-400" : strength <= 2 ? "bg-amber-400" : "bg-lemon") : "bg-muted"}`} />
                ))}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">{strengthLabel}</span>
            </div>
          )}
        </div>
      </div>
      <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl text-base text-game-caps">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create my account"}
      </Button>
    </form>
  );
}
