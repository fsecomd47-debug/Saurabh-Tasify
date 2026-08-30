"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui/Tabs";
import { FeedCard } from "@/components/social/FeedCard";
import { PlayerCard } from "@/components/social/PlayerCard";
import { FriendLeaderboard } from "@/components/social/FriendLeaderboard";
import { ChallengeCard } from "@/components/social/ChallengeCard";
import { FriendSearch } from "@/components/social/FriendSearch";
import { NotificationList } from "@/components/social/NotificationList";
import { PendingRequests } from "@/components/social/PendingRequests";
import { ConversationList } from "@/components/social/ConversationList";
import { PlayerDetailSheet } from "@/components/social/PlayerDetailSheet";
import { CommentSheet } from "@/components/social/CommentSheet";
import {
  useSocialFeed,
  useSocialFriends,
  useFriendLeaderboard,
  useSocialChallenges,
  useSocialNotifications,
  useConversations,
  usePendingRequests,
  useAcceptFriendRequest,
  socialQk,
} from "@/hooks/queries";
import { Users, Flame, Trophy, Bell, MessageCircle, Search, ChevronLeft } from "lucide-react";

type SocialTab = "feed" | "friends" | "challenges" | "notifications" | "messages";
type FriendsSubTab = "list" | "leaderboard" | "search" | "pending";

const TABS = [
  { id: "feed", label: "Feed", icon: <Flame className="w-4 h-4" /> },
  { id: "friends", label: "Friends", icon: <Users className="w-4 h-4" /> },
  { id: "challenges", label: "Challenges", icon: <Trophy className="w-4 h-4" /> },
  { id: "notifications", label: "Alerts", icon: <Bell className="w-4 h-4" /> },
  { id: "messages", label: "Chat", icon: <MessageCircle className="w-4 h-4" /> },
];

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<SocialTab>("feed");
  const [friendsSubTab, setFriendsSubTab] = useState<FriendsSubTab>("list");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [messagePartnerId, setMessagePartnerId] = useState<string | null>(null);
  const [commentSheetEventId, setCommentSheetEventId] = useState<string | null>(null);

  // Data hooks
  const feed = useSocialFeed();
  const friends = useSocialFriends();
  const leaderboard = useFriendLeaderboard();
  const challenges = useSocialChallenges();
  const notifications = useSocialNotifications();
  const conversations = useConversations();
  const pendingRequests = usePendingRequests();
  const acceptRequest = useAcceptFriendRequest();

  const handleAcceptRequest = (requestId: string) => {
    acceptRequest.mutate(requestId);
  };

  const unreadNotifications = notifications.data?.notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-[22px] font-bold text-[#1C1C1E]">Social</h1>
            <p className="text-[12px] text-[#8E8E93] font-medium">
              Your circle. Your rivals. Your wins.
            </p>
          </div>
          {activeTab === "feed" && (
            <button
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 rounded-full bg-[#F2F2F7] flex items-center justify-center"
              aria-label="Find players"
            >
              <Search className="w-4 h-4 text-[#8E8E93]" />
            </button>
          )}
        </div>

        <Tabs tabs={TABS} activeTab={activeTab} onChange={(id) => setActiveTab(id as SocialTab)} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {/* Hero card - social stats overview */}
        {activeTab === "feed" && (
          <div className="mt-3 mb-3 rounded-[20px] bg-gradient-to-br from-[#5E5CE6] to-[#7C3AED] p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="text-[22px] font-bold">{friends.data?.friends?.length ?? 0}</div>
                <div className="text-[11px] font-semibold opacity-80">Friends</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center flex-1">
                <div className="text-[22px] font-bold">
                  {leaderboard.data?.leaderboard?.find((r) => r.isCurrentUser)
                    ? `#${leaderboard.data.leaderboard.find((r) => r.isCurrentUser)!.rank}`
                    : "—"}
                </div>
                <div className="text-[11px] font-semibold opacity-80">Among Friends</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center flex-1">
                <div className="text-[22px] font-bold">
                  {challenges.data?.challenges?.filter((c) => c.status === "active").length ?? 0}
                </div>
                <div className="text-[11px] font-semibold opacity-80">Active Challenges</div>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3 pt-3"
            >
              {feed.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-[#F2F2F7] rounded-[20px] animate-pulse" />
                  ))}
                </div>
              ) : feed.data?.events?.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-[48px]">🌟</span>
                  <h3 className="text-[16px] font-bold text-[#1C1C1E] mt-3">Your circle is quiet</h3>
                  <p className="text-[13px] text-[#8E8E93] mt-1">
                    Add friends to see their progress
                  </p>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="mt-4 px-5 py-2 rounded-full bg-[#5E5CE6] text-white text-[13px] font-bold"
                  >
                    Find Players
                  </button>
                </div>
              ) : (
                feed.data?.events?.map((event) => (
                  <FeedCard key={event.id} event={event} onClick={() => setCommentSheetEventId(event.id)} />
                ))
              )}
            </motion.div>
          )}

          {activeTab === "friends" && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3 pt-3"
            >
              {/* Friends sub-tabs */}
              <div className="flex gap-1.5 bg-[#F2F2F7] rounded-[12px] p-1">
                {(["list", "leaderboard", "pending", "search"] as const).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setFriendsSubTab(sub)}
                    className={cn(
                      "flex-1 py-2 rounded-[10px] text-[12px] font-semibold transition-all",
                      friendsSubTab === sub
                        ? "bg-white text-[#1C1C1E] shadow-sm"
                        : "text-[#8E8E93]"
                    )}
                  >
                    {sub === "list" ? "Friends" : sub === "leaderboard" ? "Ranks" : sub === "pending" ? `Requests${pendingRequests.data?.requests?.length ? ` (${pendingRequests.data.requests.length})` : ""}` : "Search"}
                  </button>
                ))}
              </div>

              {/* Sub-tab content */}
              {friendsSubTab === "list" && (
                <div className="space-y-2">
                  {friends.isLoading ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-[#F2F2F7] rounded-[16px] animate-pulse" />
                    ))
                  ) : friends.data?.friends?.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="text-[40px]">👥</span>
                      <h3 className="text-[15px] font-bold text-[#1C1C1E] mt-2">Find your first teammate</h3>
                      <button
                        onClick={() => setFriendsSubTab("search")}
                        className="mt-3 px-4 py-2 rounded-full bg-[#5E5CE6] text-white text-[12px] font-bold"
                      >
                        Add Friends
                      </button>
                    </div>
                  ) : (
                    friends.data?.friends?.map((f) => (
                      <PlayerCard
                        key={f.userId}
                        player={f}
                        onClick={() => setSelectedPlayer(f.userId)}
                      />
                    ))
                  )}
                </div>
              )}

              {friendsSubTab === "leaderboard" && (
                <FriendLeaderboard
                  rows={leaderboard.data?.leaderboard ?? []}
                  onClick={(userId) => setSelectedPlayer(userId)}
                />
              )}

              {friendsSubTab === "pending" && (
                <PendingRequests
                  requests={pendingRequests.data?.requests ?? []}
                  onAccept={handleAcceptRequest}
                />
              )}

              {friendsSubTab === "search" && <FriendSearch onBack={() => setFriendsSubTab("list")} />}
            </motion.div>
          )}

          {activeTab === "challenges" && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3 pt-3"
            >
              {challenges.isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-28 bg-[#F2F2F7] rounded-[20px] animate-pulse" />
                  ))}
                </div>
              ) : challenges.data?.challenges?.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-[48px]">⚔️</span>
                  <h3 className="text-[16px] font-bold text-[#1C1C1E] mt-3">Start a friendly challenge</h3>
                  <p className="text-[13px] text-[#8E8E93] mt-1">
                    Challenge friends to grind together
                  </p>
                </div>
              ) : (
                <>
                  {/* Active challenges first */}
                  {(challenges.data?.challenges?.filter((c) => c.status === "active").length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
                        Active
                      </h3>
                      {challenges.data?.challenges
                        ?.filter((c) => c.status === "active")
                        .map((c) => (
                          <div key={c.id} className="mb-3">
                            <ChallengeCard challenge={c} />
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Pending */}
                  {(challenges.data?.challenges?.filter((c) => c.status === "pending").length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
                        Pending
                      </h3>
                      {challenges.data?.challenges
                        ?.filter((c) => c.status === "pending")
                        .map((c) => (
                          <div key={c.id} className="mb-3">
                            <ChallengeCard challenge={c} />
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Completed */}
                  {(challenges.data?.challenges?.filter((c) => c.status === "completed").length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
                        Completed
                      </h3>
                      {challenges.data?.challenges
                        ?.filter((c) => c.status === "completed")
                        .map((c) => (
                          <div key={c.id} className="mb-3">
                            <ChallengeCard challenge={c} />
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pt-3"
            >
              <NotificationList
                notifications={notifications.data?.notifications ?? []}
              />
            </motion.div>
          )}

          {activeTab === "messages" && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pt-3"
            >
              <ConversationList
                conversations={conversations.data?.conversations ?? []}
                onClick={(partnerId) => setMessagePartnerId(partnerId)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="absolute inset-0 bg-white z-50 flex flex-col"
          >
            <div className="flex items-center gap-3 p-4 border-b border-[rgba(0,0,0,0.06)]">
              <button onClick={() => setShowSearch(false)} className="p-1">
                <ChevronLeft className="w-5 h-5 text-[#5E5CE6]" />
              </button>
              <h2 className="text-[17px] font-bold text-[#1C1C1E]">Find Players</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FriendSearch onBack={() => setShowSearch(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment sheet */}
      <AnimatePresence>
        {commentSheetEventId && (
          <CommentSheet eventId={commentSheetEventId} onClose={() => setCommentSheetEventId(null)} />
        )}
      </AnimatePresence>

      {/* Player detail sheet */}
      <AnimatePresence>
        {selectedPlayer && (
          <PlayerDetailSheet userId={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
