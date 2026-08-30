"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient, ApiRequestError } from "@/types/api";
import type {
  ActivityItem,
  CatalogItemDTO,
  CompletionResult,
  CreateTaskInput,
  LeaderboardMode,
  LeaderboardPage,
  LeaderboardRow,
  PlayerDetail,
  SessionInfo,
  SnapshotData,
  Task,
  PetCatalogItem,
  PetOwnership,
  MiningStatus,
  ProfileView,
  DailyRewardStatus,
  DailyRewardClaimResult,
  PlayerCardDTO,
  SocialFeedPage,
  FriendLeaderboardRowDTO,
  ChallengeDTO,
  SocialNotificationDTO,
  ConversationPreviewDTO,
  ConversationPage,
  DirectMessageDTO,
} from "@/types/api";

/* ───────────────────────── Query keys ────────────────────────── */

export const qk = {
  session: ["session"] as const,
  snapshot: ["snapshot"] as const,
  tasks: ["tasks"] as const,
  catalog: ["catalog"] as const,
  leaderboard: ["leaderboard"] as const,
  activity: ["activity"] as const,
  pets: ["pets"] as const,
  petCatalog: ["petCatalog"] as const,
  activePet: ["activePet"] as const,
  miningStatus: ["miningStatus"] as const,
  profile: ["profile"] as const,
  dailyReward: ["dailyReward"] as const,
};

/** Invalidate everything the completion pipeline touches (spec §72). */
export function useInvalidateGame() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.snapshot });
    void qc.invalidateQueries({ queryKey: qk.tasks });
    void qc.invalidateQueries({ queryKey: qk.catalog });
    void qc.invalidateQueries({ queryKey: qk.leaderboard });
    void qc.invalidateQueries({ queryKey: qk.activity });
    void qc.invalidateQueries({ queryKey: qk.session });
    void qc.invalidateQueries({ queryKey: ["missions"] });
    void qc.invalidateQueries({ queryKey: qk.pets });
    void qc.invalidateQueries({ queryKey: qk.petCatalog });
    void qc.invalidateQueries({ queryKey: qk.activePet });
    void qc.invalidateQueries({ queryKey: qk.miningStatus });
    void qc.invalidateQueries({ queryKey: ["quests"] });
    void qc.invalidateQueries({ queryKey: ["quests", "active"] });
    void qc.invalidateQueries({ queryKey: qk.profile });
    void qc.invalidateQueries({ queryKey: qk.dailyReward });
  };
}

/* ───────────────────────── Queries ───────────────────────────── */

export function useSession() {
  return useQuery({
    queryKey: qk.session,
    queryFn: () => httpClient.get<SessionInfo>("/api/auth/session"),
    staleTime: 60_000,
    retry: false,
  });
}

export function useSnapshot() {
  return useQuery({
    queryKey: qk.snapshot,
    queryFn: () => httpClient.get<SnapshotData>("/api/me/snapshot"),
    staleTime: 15_000,
  });
}

export function useTasks() {
  return useQuery({
    queryKey: qk.tasks,
    queryFn: () => httpClient.get<Task[]>("/api/tasks"),
    staleTime: 10_000,
  });
}

export function useCatalog() {
  return useQuery({
    queryKey: qk.catalog,
    queryFn: () => httpClient.get<{ items: CatalogItemDTO[]; collections: { id: string; ownedCount: number; total: number }[] }>("/api/store/catalog"),
    staleTime: 20_000,
  });
}

export function useLeaderboard(mode: LeaderboardMode = "global") {
  return useQuery({
    queryKey: [...qk.leaderboard, mode] as const,
    queryFn: () =>
      httpClient.get<LeaderboardPage>(
        `/api/leaderboard?mode=${mode}`
      ),
    staleTime: 30_000,
  });
}

export function useLeaderboardSearch(query: string) {
  return useQuery({
    queryKey: [...qk.leaderboard, "search", query] as const,
    queryFn: () =>
      httpClient.get<{ rows: LeaderboardRow[] }>(
        `/api/leaderboard/search?q=${encodeURIComponent(query)}`
      ),
    staleTime: 10_000,
    enabled: query.trim().length >= 2,
  });
}

export function usePlayerDetail(userId: string | null) {
  return useQuery({
    queryKey: [...qk.leaderboard, "player", userId] as const,
    queryFn: () =>
      httpClient.get<PlayerDetail>(`/api/leaderboard/${userId}`),
    staleTime: 30_000,
    enabled: !!userId,
  });
}

export function useActivity() {
  return useQuery({
    queryKey: qk.activity,
    queryFn: () => httpClient.get<ActivityItem[]>("/api/activity"),
    staleTime: 30_000,
  });
}

/* ───────────────────────── Mutations ─────────────────────────── */

export function useCreateTask() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => httpClient.post<Task>("/api/tasks", input),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (taskId: string) => httpClient.del<{ deleted: boolean }>(`/api/tasks/${taskId}`),
    onSuccess: invalidate,
  });
}

/**
 * Completes a task. On success the server returns the authoritative reward
 * payload that drives the celebration modal; cache invalidation follows.
 */
export function useCompleteTask(onSuccess?: (result: CompletionResult) => void) {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (taskId: string) => httpClient.post<CompletionResult>(`/api/tasks/${taskId}/complete`),
    onSuccess: (result) => {
      invalidate();
      onSuccess?.(result);
    },
  });
}

export function usePurchaseItem() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (itemId: string) => httpClient.post<{ itemId: string; pricePaid: number; balance: number; effect?: unknown }>("/api/store/purchase", { itemId }),
    onSuccess: invalidate,
  });
}

export function useEquipItem() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (input: { itemId: string; equipped: boolean }) =>
      httpClient.post<{ itemId: string; equipped: boolean }>("/api/store/equip", input),
    onSuccess: invalidate,
  });
}

export function useRedeemItem() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (itemId: string) => httpClient.post<{ redeemed: boolean }>("/api/store/redeem", { itemId }),
    onSuccess: invalidate,
  });
}

export function useToggleWishlist() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (input: { itemId: string; add: boolean }) =>
      httpClient.post<{ inWishlist: boolean }>("/api/store/wishlist", input),
    onSuccess: invalidate,
  });
}

export function useSetGoal() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (itemId: string | null) => httpClient.post<{ goalItemId: string | null }>("/api/store/goal", { itemId }),
    onSuccess: invalidate,
  });
}

export function useClaimQuest() {
  const invalidate = useInvalidateGame();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questId: string) =>
      httpClient.post<import("@/types/api").QuestClaimResult>("/api/quests/claim", { questId }),
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ["quests"] });
    },
  });
}

export function useUpdateProfile() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (patch: { displayName?: string; avatarId?: string }) =>
      httpClient.patch<{ updated: boolean }>("/api/me/profile", patch),
    onSuccess: invalidate,
  });
}

/* ──────────────────── PDR-3: Missions ───────────────────────── */

export function useMissions() {
  return useQuery({
    queryKey: ["missions"],
    queryFn: () => httpClient.get<{ missions: any[]; active: any | null }>("/api/missions"),
    staleTime: 10_000,
  });
}

export function useMission(missionId: string | null) {
  return useQuery({
    queryKey: ["missions", missionId],
    queryFn: () => httpClient.get<any>(`/api/missions/${missionId}`),
    enabled: !!missionId,
    staleTime: 10_000,
  });
}

export function useAnalyzeTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => httpClient.post<any>(`/api/tasks/${taskId}/analyze`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["missions"] }),
  });
}

export function useCreateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => httpClient.post<any>("/api/missions", { taskId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["missions"] }),
  });
}

export function useStartMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (missionId: string) => httpClient.post<any>(`/api/missions/${missionId}/start`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["snapshot"] });
    },
  });
}

export function useCancelMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (missionId: string) => httpClient.post<any>(`/api/missions/${missionId}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["snapshot"] });
    },
  });
}

export { ApiRequestError };

/* ──────────────────── PDR-5: Pets ─────────────────────────── */

export function usePetCatalog() {
  return useQuery({
    queryKey: qk.petCatalog,
    queryFn: () => httpClient.get<PetCatalogItem[]>("/api/pets"),
    staleTime: 20_000,
  });
}

export function useUserPets() {
  return useQuery({
    queryKey: qk.pets,
    queryFn: () => httpClient.get<PetOwnership[]>("/api/me/pets"),
    staleTime: 10_000,
  });
}

export function useActivePet() {
  return useQuery({
    queryKey: qk.activePet,
    queryFn: () => httpClient.get<PetOwnership | null>("/api/me/pets/active"),
    staleTime: 10_000,
  });
}

export function useMiningStatus() {
  return useQuery({
    queryKey: qk.miningStatus,
    queryFn: () => httpClient.get<MiningStatus>("/api/me/pets/mining"),
    staleTime: 15_000,
  });
}

export function usePurchasePet() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (petId: string) => httpClient.post<PetOwnership>("/api/pets/" + petId + "/purchase", { petId }),
    onSuccess: invalidate,
  });
}

export function useEquipPet() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: (petId: string) => httpClient.post<{ equipped: boolean; petName: string }>(`/api/pets/${petId}/equip`),
    onSuccess: invalidate,
  });
}

export function useUnequipPet() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: () => httpClient.post<{ unequipped: boolean }>("/api/pets/unequip"),
    onSuccess: invalidate,
  });
}

export function useSettleMining() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: () => httpClient.post<{ stMined: number; settled: boolean }>("/api/me/pets/mining/settle"),
    onSuccess: invalidate,
  });
}

/* ──────────────────── PDR-5 Feature-2: Profile ─────────────────── */

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: () => httpClient.get<ProfileView>("/api/profile/me"),
    staleTime: 15_000,
  });
}

/* ──────────────────── PDR-5 Feature-3: Daily Rewards ────────────── */

export function useDailyReward() {
  return useQuery({
    queryKey: qk.dailyReward,
    queryFn: () => httpClient.get<DailyRewardStatus>("/api/rewards/daily"),
    staleTime: 10_000,
  });
}

export function useClaimDailyReward() {
  const invalidate = useInvalidateGame();
  return useMutation({
    mutationFn: () => httpClient.post<DailyRewardClaimResult>("/api/rewards/daily/claim"),
    onSuccess: (result) => {
      invalidate();
    },
  });
}

/* ──────────────────── PDR-5 Feature-5: Quests ─────────────────── */

export function useQuests() {
  return useQuery({
    queryKey: ["quests"],
    queryFn: () => httpClient.get<import("@/types/api").QuestBoard>("/api/quests"),
    staleTime: 10_000,
  });
}

export function useActiveQuest() {
  return useQuery({
    queryKey: ["quests", "active"],
    queryFn: () => httpClient.get<import("@/types/api").QuestView | null>("/api/quests/active"),
    staleTime: 10_000,
  });
}

export function useQuestHistory() {
  return useQuery({
    queryKey: ["quests", "history"],
    queryFn: () =>
      httpClient.get<{ history: { questId: string; status: string; startedAt: string | null; completedAt: string | null; claimedAt: string | null }[] }>("/api/quests/history"),
    staleTime: 30_000,
  });
}

export function useRerollQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questId: string) =>
      httpClient.post<{ oldQuestId: string; newQuestId: string; newQuest: Record<string, unknown> }>("/api/quests/reroll", { questId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quests"] });
    },
  });
}

/* ──────────────────── PDR-5 Feature-6: Social ──────────────────── */

export const socialQk = {
  friends: ["social", "friends"] as const,
  feed: ["social", "feed"] as const,
  friendLeaderboard: ["social", "friendLeaderboard"] as const,
  challenges: ["social", "challenges"] as const,
  notifications: ["social", "notifications"] as const,
  conversations: ["social", "conversations"] as const,
  pendingRequests: ["social", "pendingRequests"] as const,
  playerCard: (userId: string) => ["social", "playerCard", userId] as const,
  conversation: (partnerId: string) => ["social", "conversation", partnerId] as const,
  search: (q: string) => ["social", "search", q] as const,
  comments: (eventId: string) => ["social", "comments", eventId] as const,
};

export function useSocialFriends() {
  return useQuery({
    queryKey: socialQk.friends,
    queryFn: () => httpClient.get<{ friends: PlayerCardDTO[] }>("/api/social/friends"),
    staleTime: 15_000,
  });
}

export function useSocialFeed(cursor?: string) {
  return useQuery({
    queryKey: [...socialQk.feed, cursor] as const,
    queryFn: () =>
      httpClient.get<SocialFeedPage>(
        `/api/social/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`
      ),
    staleTime: 10_000,
  });
}

export function useFriendLeaderboard() {
  return useQuery({
    queryKey: socialQk.friendLeaderboard,
    queryFn: () =>
      httpClient.get<{ leaderboard: FriendLeaderboardRowDTO[] }>("/api/social/leaderboard"),
    staleTime: 30_000,
  });
}

export function useSocialChallenges(status?: string) {
  return useQuery({
    queryKey: [...socialQk.challenges, status] as const,
    queryFn: () =>
      httpClient.get<{ challenges: ChallengeDTO[] }>(
        `/api/social/challenges${status ? `?status=${status}` : ""}`
      ),
    staleTime: 10_000,
  });
}

export function useSocialNotifications() {
  return useQuery({
    queryKey: socialQk.notifications,
    queryFn: () =>
      httpClient.get<{ notifications: SocialNotificationDTO[] }>("/api/social/notifications"),
    staleTime: 10_000,
  });
}

export function useConversations() {
  return useQuery({
    queryKey: socialQk.conversations,
    queryFn: () =>
      httpClient.get<{ conversations: ConversationPreviewDTO[] }>("/api/social/messages"),
    staleTime: 10_000,
  });
}

export function useConversation(partnerId: string | null) {
  return useQuery({
    queryKey: socialQk.conversation(partnerId ?? ""),
    queryFn: () =>
      httpClient.get<ConversationPage>(`/api/social/messages/${partnerId}`),
    enabled: !!partnerId,
    staleTime: 5_000,
  });
}

export function usePendingRequests() {
  return useQuery({
    queryKey: socialQk.pendingRequests,
    queryFn: () =>
      httpClient.get<{ requests: PlayerCardDTO[] }>("/api/social/friends/pending"),
    staleTime: 10_000,
  });
}

export function usePlayerCard(userId: string | null) {
  return useQuery({
    queryKey: socialQk.playerCard(userId ?? ""),
    queryFn: () => httpClient.get<{ card: PlayerCardDTO }>(`/api/social/profile/${userId}`),
    enabled: !!userId,
    staleTime: 15_000,
  });
}

export function useSocialSearch(query: string) {
  return useQuery({
    queryKey: socialQk.search(query),
    queryFn: () =>
      httpClient.get<{ results: PlayerCardDTO[] }>(
        `/api/social/friends/search?q=${encodeURIComponent(query)}`
      ),
    staleTime: 10_000,
    enabled: query.trim().length >= 2,
  });
}

export function useComments(eventId: string | null) {
  return useQuery({
    queryKey: socialQk.comments(eventId ?? ""),
    queryFn: () =>
      httpClient.get<{ comments: Array<{ id: string; userId: string; displayName: string; avatarEmoji: string; body: string; createdAt: string }> }>(`/api/social/feed/${eventId}/comments`),
    enabled: !!eventId,
  });
}

/* ── Social Mutations ── */

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetId: string) =>
      httpClient.post<{ sent: boolean }>("/api/social/friends/request", { targetId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.friends });
      qc.invalidateQueries({ queryKey: socialQk.pendingRequests });
    },
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      httpClient.post<{ accepted: boolean }>("/api/social/friends/accept", { requestId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.friends });
      qc.invalidateQueries({ queryKey: socialQk.pendingRequests });
      qc.invalidateQueries({ queryKey: socialQk.friendLeaderboard });
    },
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (friendId: string) =>
      httpClient.del<{ removed: boolean }>(`/api/social/friends/${friendId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.friends });
      qc.invalidateQueries({ queryKey: socialQk.friendLeaderboard });
    },
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { targetId: string; action: "block" | "unblock" }) =>
      httpClient.post<{ updated: boolean }>("/api/social/friends/block", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.friends });
      qc.invalidateQueries({ queryKey: socialQk.friendLeaderboard });
    },
  });
}

export function useSendReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { eventId: string; emoji: string }) =>
      httpClient.post<{ added: boolean }>(`/api/social/feed/${input.eventId}/reactions`, { emoji: input.emoji }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.feed });
    },
  });
}

export function useRemoveReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      httpClient.del<{ removed: boolean }>(`/api/social/feed/${eventId}/reactions`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.feed });
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { eventId: string; body: string }) =>
      httpClient.post<{ added: boolean }>(`/api/social/feed/${input.eventId}/comments`, { body: input.body }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: socialQk.feed });
      qc.invalidateQueries({ queryKey: socialQk.comments(variables.eventId) });
    },
  });
}

export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { inviteeId: string; metric?: string; title?: string }) =>
      httpClient.post<{ challenge: ChallengeDTO }>("/api/social/challenges", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.challenges });
    },
  });
}

export function useAcceptChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) =>
      httpClient.post<{ accepted: boolean }>(`/api/social/challenges/${challengeId}/accept`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.challenges });
    },
  });
}

export function useDeclineChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) =>
      httpClient.post<{ declined: boolean }>(`/api/social/challenges/${challengeId}/decline`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.challenges });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { receiverId: string; body: string }) =>
      httpClient.post<{ message: DirectMessageDTO }>("/api/social/messages", input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: socialQk.conversations });
      qc.invalidateQueries({ queryKey: socialQk.conversation(variables.receiverId) });
    },
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId?: string) =>
      httpClient.post<{ marked: boolean }>("/api/social/notifications/read", { notificationId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.notifications });
    },
  });
}

export function useReportContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      targetType: "user" | "comment" | "message" | "feed_event";
      targetId: string;
      reason: string;
      details?: string;
    }) => httpClient.post<{ reported: boolean }>("/api/social/reports", input),
  });
}

export function useRematchChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) =>
      httpClient.post<{ challenge: ChallengeDTO }>(`/api/social/challenges/${challengeId}/rematch`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialQk.challenges });
    },
  });
}
