"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api, apiQ, timeAgo } from "@/lib/client-api";
import type { AdminStats, ReportDTO, Role } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/common/user-avatar";
import { RoleBadge } from "@/components/common/role-badge";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  LayoutDashboard, Users, FileWarning, Loader2, Ban, CheckCircle2, ShieldCheck, Search, TrendingUp, MessageSquare, Newspaper, Megaphone, CalendarDays, Flag, Activity, Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_RANK } from "@/lib/role-utils";

export function AdminView() {
  const user = useAppStore((s) => s.user);
  const [tab, setTab] = useState<"overview" | "users" | "moderation">("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiQ<AdminStats>("/api/admin/stats"),
  });

  if (!user || ROLE_RANK[user.role] < ROLE_RANK.ADMIN) {
    return <EmptyState emoji="🔐" title="Admin access required" description="This area is reserved for admins and superadmins." />;
  }

  if (isLoading || !data) {
    return <div className="space-y-4"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></div>;
  }

  const s = data.stats;
  const statCards = [
    { label: "Users", value: s.users, icon: Users, delta: `${s.roleDist.STUDENT ?? 0} students` },
    { label: "Posts", value: s.posts, icon: Newspaper, delta: "all time" },
    { label: "Messages", value: s.messages, icon: MessageSquare, delta: "groups + sidechat" },
    { label: "Events", value: s.events, icon: CalendarDays, delta: "campus life" },
    { label: "Groups", value: s.groups, icon: Users, delta: "active" },
    { label: "Channels", value: s.channels, icon: Megaphone, delta: `${s.roleDist.ADMIN ?? 0} admins` },
    { label: "Open reports", value: s.openReports, icon: Flag, delta: "moderation queue" },
    { label: "Sessions", value: s.activeSessions, icon: Activity, delta: "signed in" },
  ];

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-forest p-6 text-lemon-soft shadow-[0_6px_0_0_rgba(12,17,11,0.35)]">
        <div className="relative flex flex-wrap items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-ink bg-lemon shadow-[0_3px_0_0_rgba(12,17,11,0.35)]">
            <ShieldCheck className="h-6 w-6 text-ink" strokeWidth={2.5} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white">Mission control 🛡</h1>
            <p className="text-xs font-bold text-lemon-soft/70">
              Signed in as {user.name} · {user.role === "SUPERADMIN" ? "superadmin — full control" : "admin — campus-wide powers"}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1">
          <TabsTrigger value="overview" className="gap-1.5 rounded-xl font-semibold"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 rounded-xl font-semibold"><Users className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="moderation" className="gap-1.5 rounded-xl font-semibold"><FileWarning className="h-4 w-4" /> Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="game-card rounded-3xl p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{c.label}</p>
                  <c.icon className="h-4 w-4 text-lime-600" />
                </div>
                <p className="mt-1.5 font-display text-2xl font-extrabold text-lime-700 dark:text-lime-400">{c.value}</p>
                <p className="text-[10px] text-muted-foreground">{c.delta}</p>
              </motion.div>
            ))}
          </div>

          {/* activity chart */}
          <div className="game-card rounded-3xl p-5">
            <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold">
              <TrendingUp className="h-4 w-4 text-lime-600" /> Campus activity — last 14 days
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.activity} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "2px solid var(--edge)", borderRadius: 16, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 0 0 var(--edge-soft)" }}
                     labelStyle={{ fontWeight: 800 }}
                  />
                  <Bar dataKey="posts" name="Posts" fill="#a3e635" radius={[6, 6, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="messages" name="Messages" fill="#4d7c0f" radius={[6, 6, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* top posts */}
          <div className="game-card rounded-3xl p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold"><Flame className="h-4 w-4 text-lime-600" /> Hottest posts right now</h3>
            <div className="space-y-2">
              {data.topPosts.map((p, i) => (
                <div key={p.id} className="game-inset flex items-center gap-3 p-3">
                  <span className="font-display text-lg font-bold text-lemon">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{p.content}</p>
                    <p className="text-[10px] text-muted-foreground">{p.author.name} · {timeAgo(p.createdAt)} ago</p>
                  </div>
                  <div className="shrink-0 text-right text-[10px] font-bold">
                    <p className="text-lime-700 dark:text-lime-400">❤ {p.stats.reactions}</p>
                    <p className="text-muted-foreground">💬 {p.stats.comments}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersTable users={data.users} isSuper={user.role === "SUPERADMIN"} />
        </TabsContent>

        <TabsContent value="moderation" className="mt-4">
          <ModerationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTable({ users, isSuper }: { users: AdminStats["users"]; isSuper: boolean }) {
  const qc = useQueryClient();
  const me = useAppStore((s) => s.user);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (q.trim() && !`${u.name} ${u.email} ${u.department ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const act = async (userId: string, body: Record<string, unknown>, successMsg: string) => {
    setBusy(userId);
    const res = await api("/api/admin/users", { method: "PATCH", body: { userId, ...body } });
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    toast.success(successMsg);
  };

  return (
    <div className="game-card rounded-3xl">
      <div className="flex flex-wrap items-center gap-2.5 border-b-2 border-edge p-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="h-9 rounded-2xl pl-9 text-xs" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-9 w-36 rounded-2xl text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["ALL", "STUDENT", "LECTURER", "ADMIN", "SUPERADMIN"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="ml-auto text-[10px] font-bold text-muted-foreground">{filtered.length} users</p>
      </div>

      <div className="max-h-[62svh] overflow-auto nice-scrollbar">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">User</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Role</TableHead>
              <TableHead className="hidden text-[10px] uppercase tracking-widest sm:table-cell">Activity</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Status</TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id} className={cn(u.banned && "opacity-50")}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar user={u} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{u.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {isSuper ? (
                    <Select
                      value={u.role}
                      onValueChange={(r) => act(u.id, { role: r }, `${u.name} is now ${r}`)}
                      disabled={busy === u.id || u.id === me?.id}
                    >
                      <SelectTrigger className="h-8 w-36 rounded-xl text-[10px] font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["STUDENT", "LECTURER", "ADMIN", "SUPERADMIN"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <RoleBadge role={u.role} />
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <p className="text-[10px] font-bold">{u.counts.posts} posts · {u.counts.comments} comments</p>
                  <p className="text-[9px] text-muted-foreground">{u.counts.groups} groups · {u.provider}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.verified && <Badge className="bg-lemon text-[9px] font-bold text-ink">VERIFIED</Badge>}
                    {u.banned && <Badge className="bg-red-500 text-[9px] font-bold">BANNED</Badge>}
                    {!u.verified && !u.banned && <span className="text-[10px] text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {busy === u.id && <Loader2 className="h-4 w-4 animate-spin text-lemon" />}
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => act(u.id, { action: u.verified ? "unverify" : "verify" }, u.verified ? "Verification removed" : "User verified ✓")}
                      className="h-8 rounded-xl px-2 text-[10px] font-bold"
                      disabled={busy === u.id}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {u.verified ? "Unverify" : "Verify"}
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => act(u.id, { action: u.banned ? "unban" : "ban" }, u.banned ? `${u.name} unbanned` : `${u.name} banned & sessions revoked`)}
                      className="h-8 rounded-xl px-2 text-[10px] font-bold text-red-600 hover:text-red-700"
                      disabled={busy === u.id || u.role === "SUPERADMIN"}
                    >
                      <Ban className="h-3.5 w-3.5" /> {u.banned ? "Unban" : "Ban"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ModerationPanel() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ["admin-reports"], queryFn: () => apiQ<{ reports: ReportDTO[] }>("/api/admin/reports") });
  const reports = data?.reports ?? [];

  const act = async (reportId: string, status: "RESOLVED" | "DISMISSED", deleteTarget: boolean) => {
    setBusy(reportId);
    const res = await api("/api/admin/reports", {
      method: "PATCH",
      body: { reportId, status, deleteTarget },
    });
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["feed"] });
    toast.success(status === "RESOLVED" ? "Report resolved ✅" : "Report dismissed");
  };

  if (reports.length === 0) {
    return <EmptyState emoji="🕊" title="Moderation queue is clear" description="No open reports. The campus is at peace." />;
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "game-card rounded-3xl p-5",
            r.status === "OPEN" ? "border-amber-300/60" : "opacity-60"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={r.status === "OPEN" ? "default" : "secondary"} className="rounded-full text-[9px] font-bold">
              {r.status}
            </Badge>
            <Badge variant="outline" className="rounded-full text-[9px] font-bold uppercase">{r.targetType}</Badge>
            <span className="ml-auto text-[10px] text-muted-foreground">reported {timeAgo(r.createdAt)} ago by {r.reporter.name}</span>
          </div>

          <p className="mt-3 text-sm font-bold">"{r.reason}"</p>

          {r.target && (
            <div className="game-inset mt-3 p-3.5">
              {r.targetType === "POST" && (
                <div className="flex items-start gap-3">
                  <UserAvatar user={{ name: r.target.name ?? "Author", avatarUrl: null }} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold">{r.target.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{r.target.content}</p>
                  </div>
                </div>
              )}
              {r.targetType === "USER" && (
                <div className="flex items-center gap-3">
                  <UserAvatar user={{ name: r.target.name ?? "User", avatarUrl: r.target.avatarUrl ?? null }} size="sm" />
                  <p className="text-xs font-bold">{r.target.name}</p>
                </div>
              )}
            </div>
          )}

          {r.status === "OPEN" && (
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                onClick={() => act(r.id, "RESOLVED", true)}
                disabled={busy === r.id}
                className="rounded-2xl bg-red-600 text-xs font-bold hover:bg-red-700"
              >
                {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Remove {r.targetType === "USER" ? "user" : "content"}
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={() => act(r.id, "RESOLVED", false)}
                disabled={busy === r.id}
                className="rounded-2xl text-xs font-bold"
              >
                <CheckCircle2 className="h-4 w-4" /> Keep, resolve
              </Button>
              <Button
                size="sm" variant="ghost"
                onClick={() => act(r.id, "DISMISSED", false)}
                disabled={busy === r.id}
                className="rounded-2xl text-xs font-bold"
              >
                Dismiss
              </Button>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
