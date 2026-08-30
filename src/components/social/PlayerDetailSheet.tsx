"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { usePlayerCard, useRemoveFriend, useBlockUser, useCreateChallenge, useSendFriendRequest, useReportContent } from "@/hooks/queries";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "harassment", label: "Harassment" },
  { value: "fake_achievement", label: "Fake achievement" },
  { value: "other", label: "Other" },
] as const;

type PlayerDetailSheetProps = {
  userId: string;
  onClose: () => void;
  onMessage?: (partnerId: string) => void;
};

export const PlayerDetailSheet: React.FC<PlayerDetailSheetProps> = ({
  userId,
  onClose,
  onMessage,
}) => {
  const playerQuery = usePlayerCard(userId);
  const player = playerQuery.data?.card;
  const removeFriend = useRemoveFriend();
  const blockUser = useBlockUser();
  const createChallenge = useCreateChallenge();
  const sendRequest = useSendFriendRequest();
  const reportContent = useReportContent();
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const handleChallenge = () => {
    createChallenge.mutate(
      { inviteeId: userId },
      { onSuccess: () => onClose() }
    );
  };

  const handleRemoveFriend = () => {
    removeFriend.mutate(userId, { onSuccess: () => onClose() });
  };

  const handleBlock = () => {
    blockUser.mutate(
      { targetId: userId, action: "block" },
      { onSuccess: () => onClose() }
    );
  };

  const handleReport = () => {
    if (!reportReason) return;
    reportContent.mutate(
      { targetType: "user", targetId: userId, reason: reportReason },
      { onSuccess: () => { setShowReport(false); onClose(); } }
    );
  };

  if (playerQuery.isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="h-20 bg-[#F2F2F7] rounded-full animate-pulse mx-auto w-20" />
        <div className="h-5 bg-[#F2F2F7] rounded animate-pulse mt-3 w-32 mx-auto" />
      </div>
    );
  }

  if (!player) return null;

  return (
    <div className="space-y-6 p-1">
      {/* Large player card */}
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex items-center justify-center text-[36px] mb-3">
          {player.avatarEmoji}
        </div>
        <h2 className="text-[20px] font-bold text-[#1C1C1E]">{player.displayName}</h2>
        <p className="text-[13px] text-[#8E8E93] font-medium">{player.title}</p>
        <p className="text-[12px] text-[#8E8E93]">LV.{player.level}</p>

        {/* Pet */}
        {player.petEmoji && (
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-[#F2F2F7] rounded-full">
            <span className="text-[14px]">{player.petEmoji}</span>
            <span className="text-[12px] font-semibold text-[#636366]">{player.petName}</span>
            <span className="text-[11px] text-[#8E8E93]">Lv.{player.petLevel}</span>
          </div>
        )}

        {/* Rank */}
        {player.rank && (
          <div className="mt-2 px-3 py-1.5 bg-[#EDE9FE] rounded-full">
            <span className="text-[12px] font-bold text-[#5E5CE6]">Global #{player.rank}</span>
          </div>
        )}
      </div>

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-[24px] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-[#1C1C1E]">Report Player</h3>
              <button onClick={() => setShowReport(false)} className="text-[14px] text-[#5E5CE6] font-semibold">Cancel</button>
            </div>
            <p className="text-[13px] text-[#8E8E93]">Why are you reporting {player.displayName}?</p>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReportReason(r.value)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-[14px] text-[14px] font-semibold transition-all",
                    reportReason === r.value
                      ? "bg-[#5E5CE6] text-white"
                      : "bg-[#F2F2F7] text-[#1C1C1E]"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Button
              onClick={handleReport}
              disabled={!reportReason || reportContent.isPending}
              className="w-full bg-[#FF3B30] hover:bg-[#D32F2F] text-white"
            >
              {reportContent.isPending ? "Reporting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {player.socialRelationship === "friends" && (
          <>
            <Button
              onClick={handleChallenge}
              disabled={createChallenge.isPending}
              className="w-full"
            >
              {createChallenge.isPending ? "Creating..." : "Challenge"}
            </Button>
            {onMessage && (
              <Button
                variant="secondary"
                onClick={() => onMessage(userId)}
                className="w-full"
              >
                Message
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleRemoveFriend}
              disabled={removeFriend.isPending}
              className="w-full text-[#FF3B30]"
            >
              Remove Friend
            </Button>
            <Button
              variant="secondary"
              onClick={handleBlock}
              disabled={blockUser.isPending}
              className="w-full text-[#FF3B30]"
            >
              Block User
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowReport(true)}
              className="w-full text-[#FF3B30]"
            >
              Report Player
            </Button>
          </>
        )}
        {player.socialRelationship === "none" && (
          <Button
            onClick={() => {
              sendRequest.mutate(userId, { onSuccess: onClose });
            }}
            className="w-full"
          >
            Add Friend
          </Button>
        )}
        {player.socialRelationship === "requested" && (
          <div className="text-center py-2">
            <span className="text-[13px] font-semibold text-[#8E8E93]">Friend Request Sent</span>
          </div>
        )}
        {player.socialRelationship === "incoming_request" && (
          <div className="text-center py-2">
            <span className="text-[13px] font-semibold text-[#F59E0B]">Wants to connect</span>
          </div>
        )}
      </div>
    </div>
  );
};
