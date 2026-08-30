"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { useComments, useAddComment } from "@/hooks/queries";

type CommentSheetProps = {
  eventId: string | null;
  onClose: () => void;
};

export const CommentSheet: React.FC<CommentSheetProps> = ({ eventId, onClose }) => {
  const comments = useComments(eventId);
  const addComment = useAddComment();
  const [text, setText] = useState("");

  return (
    <AnimatePresence>
      {eventId && (
        <motion.div
          key="comment-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            key="comment-sheet-content"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-[24px] w-full max-w-md h-[60vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(0,0,0,0.06)]">
              <h3 className="text-[17px] font-bold text-[#1C1C1E]">Comments</h3>
              <button onClick={onClose} className="p-1" aria-label="Close comments">
                <X className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </div>

            {/* Comment list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {comments.isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-[#F2F2F7] rounded-[12px] animate-pulse" />
                ))
              ) : comments.data?.comments?.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-[32px]">💬</span>
                  <p className="text-[13px] text-[#8E8E93] mt-2">No comments yet</p>
                </div>
              ) : (
                comments.data?.comments?.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex items-center justify-center text-[14px] flex-shrink-0">
                      {c.avatarEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-bold text-[#1C1C1E]">{c.displayName}</span>
                        <span className="text-[11px] text-[#8E8E93]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#636366] mt-0.5">{c.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="px-5 py-3 border-t border-[rgba(0,0,0,0.06)] flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const trimmed = text.trim();
                    if (!trimmed || trimmed.length > 280) return;
                    addComment.mutate(
                      { eventId, body: trimmed },
                      {
                        onSuccess: () => {
                          setText("");
                          comments.refetch();
                        },
                      }
                    );
                  }
                }}
                placeholder="Write a comment..."
                maxLength={280}
                className="flex-1 bg-[#F2F2F7] rounded-full px-4 py-2 text-[13px] text-[#1C1C1E] placeholder:text-[#8E8E93] outline-none"
                aria-label="Comment text"
              />
              <button
                onClick={() => {
                  const trimmed = text.trim();
                  if (!trimmed || trimmed.length > 280) return;
                  addComment.mutate(
                    { eventId, body: trimmed },
                    {
                      onSuccess: () => {
                        setText("");
                        comments.refetch();
                      },
                    }
                  );
                }}
                disabled={!text.trim() || addComment.isPending}
                className="w-8 h-8 rounded-full bg-[#5E5CE6] flex items-center justify-center disabled:opacity-40"
                aria-label="Submit comment"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
