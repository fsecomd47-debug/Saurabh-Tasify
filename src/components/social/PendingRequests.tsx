"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PlayerCard } from "./PlayerCard";
import { Button } from "@/components/ui/Button";
import type { PlayerCardDTO } from "@/types/api";
import { useSendFriendRequest, useRemoveFriend, useBlockUser } from "@/hooks/queries";

type PendingRequestsProps = {
  requests: PlayerCardDTO[];
  onAccept: (requestId: string) => void;
};

export const PendingRequests: React.FC<PendingRequestsProps> = ({ requests, onAccept }) => {
  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-wider px-1">
        Pending Requests ({requests.length})
      </h3>
      {requests.map((player) => (
        <PlayerCard
          key={player.userId}
          player={player}
          size="md"
          action={
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAccept(player.userId);
              }}
              className="px-3 py-1.5 rounded-full bg-[#34C759] text-white text-[12px] font-bold hover:bg-[#2DB84E] transition-colors"
            >
              Accept
            </button>
          }
        />
      ))}
    </div>
  );
};
