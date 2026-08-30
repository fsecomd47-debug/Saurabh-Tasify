"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { PlayerCard } from "./PlayerCard";
import { useSendFriendRequest } from "@/hooks/queries";
import type { PlayerCardDTO } from "@/types/api";

type FriendSearchProps = {
  onBack: () => void;
};

export const FriendSearch: React.FC<FriendSearchProps> = ({ onBack }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerCardDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const sendRequest = useSendFriendRequest();

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/social/friends/search?q=${encodeURIComponent(q)}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      setResults(data.data?.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = (targetId: string) => {
    sendRequest.mutate(targetId);
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Input
          type="text"
          placeholder="Search players..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full"
          autoFocus
          aria-label="Search players by name"
        />
      </div>

      {/* Results */}
      {searching && (
        <div className="text-center py-4">
          <span className="text-[13px] text-[#8E8E93]">Searching...</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((player) => (
            <PlayerCard
              key={player.userId}
              player={player}
              size="md"
              action={
                player.socialRelationship === "none" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddFriend(player.userId);
                    }}
                    disabled={sendRequest.isPending}
                    className="px-3 py-1.5 rounded-full bg-[#5E5CE6] text-white text-[12px] font-bold hover:bg-[#4F46E5] transition-colors disabled:opacity-50"
                  >
                    {sendRequest.isPending ? "..." : "Add"}
                  </button>
                ) : player.socialRelationship === "requested" ? (
                  <span className="text-[12px] font-semibold text-[#8E8E93]">Requested</span>
                ) : player.socialRelationship === "friends" ? (
                  <span className="text-[12px] font-semibold text-[#34C759]">Friends</span>
                ) : player.socialRelationship === "incoming_request" ? (
                  <span className="text-[12px] font-semibold text-[#F59E0B]">Incoming</span>
                ) : player.socialRelationship === "blocked" ? (
                  <span className="text-[12px] font-semibold text-[#FF3B30]">Blocked</span>
                ) : null
              }
            />
          ))}
        </div>
      )}

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <div className="text-center py-8">
          <span className="text-[32px]">🔍</span>
          <p className="text-[14px] text-[#8E8E93] mt-2 font-medium">No players found</p>
          <p className="text-[12px] text-[#C7C7CC]">Try a different search</p>
        </div>
      )}
    </div>
  );
};
