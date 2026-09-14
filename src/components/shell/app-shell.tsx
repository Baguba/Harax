"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Sidebar, Topbar, MobileNav, useUnreadCount, logoutFlow } from "@/components/shell/app-chrome";
import { FeedView } from "@/components/feed/feed-view";
import { EventsView } from "@/components/events/events-view";
import { GroupsView } from "@/components/groups/groups-view";
import { GroupDetail } from "@/components/groups/group-detail";
import { ChannelsView } from "@/components/channels/channels-view";
import { ChannelDetail } from "@/components/channels/channel-detail";
import { SideChatView } from "@/components/sidechat/sidechat-view";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { ProfileView } from "@/components/profile/profile-view";
import { AdminView } from "@/components/admin/admin-view";
import { ExploreView } from "@/components/feed/explore-view";
import { RightRail } from "@/components/shell/right-rail";
import { PostComposer } from "@/components/feed/post-composer";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client-api";
import type { SessionUser } from "@/lib/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } },
});

export function AppShell({ initialUser }: { initialUser: SessionUser }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ShellInner />
    </QueryClientProvider>
  );
}

function ShellInner() {
  const { user, setUser, view } = useAppStore();
  const unread = useUnreadCount(Boolean(user));
  const qc = useQueryClient();

  if (!user) return null;

  const handleLogout = async () => {
    await logoutFlow();
    setUser(null);
    qc.clear();
  };

  const wide = view.name === "admin" || view.name === "groups" || view.name === "channels" || view.name === "sidechat" || view.name === "events";
  const showRail = view.name === "feed";

  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar unread={unread} onLogout={handleLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar unread={unread} onLogout={handleLogout} />

        <div className="flex flex-1">
          <main className="mx-auto w-full min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-5 lg:pb-8" id="main-content">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${view.name}:${view.id ?? ""}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={showRail ? "mx-auto max-w-[640px]" : wide ? "mx-auto max-w-6xl" : "mx-auto max-w-[640px]"}
              >
                <ViewRouter />
              </motion.div>
            </AnimatePresence>
          </main>

          {showRail && (
            <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-[320px] shrink-0 overflow-y-auto border-l-2 border-edge bg-card p-4 nice-scrollbar xl:block">
              <RightRail />
            </aside>
          )}
        </div>

        <MobileNav unread={unread} />
      </div>

      {/* mobile composer sheet */}
      <MobileComposerSheet />
    </div>
  );
}

function ViewRouter() {
  const view = useAppStore((s) => s.view);
  switch (view.name) {
    case "feed":
      return <FeedView />;
    case "explore":
      return <ExploreView />;
    case "events":
      return <EventsView />;
    case "groups":
      return <GroupsView />;
    case "group":
      return <GroupDetail key={view.id} groupId={view.id!} />;
    case "channels":
      return <ChannelsView />;
    case "channel":
      return <ChannelDetail key={view.id} channelId={view.id!} />;
    case "sidechat":
      return <SideChatView />;
    case "notifications":
      return <NotificationsView />;
    case "profile":
      return <ProfileView key={view.id} userId={view.id!} />;
    case "admin":
      return <AdminView />;
    default:
      return <FeedView />;
  }
}

function MobileComposerSheet() {
  const { composerOpen, setComposerOpen, user } = useAppStore();
  if (!user) return null;
  return (
    <AnimatePresence>
      {composerOpen && (
        <>
          <motion.button
            className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setComposerOpen(false)}
            aria-label="Close composer"
          />
          <motion.div
            className="fixed inset-x-3 bottom-4 z-50 game-card rounded-3xl p-4 lg:hidden"
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <PostComposer onPosted={() => setComposerOpen(false)} autoFocus />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
