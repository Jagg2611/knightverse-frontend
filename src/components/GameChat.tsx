// src/components/GameChat.tsx
import React, { useEffect, useRef, useState } from "react";

interface ChatMessage {
  _id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

interface Props {
  messages: ChatMessage[];
  currentUserId?: string;
  onSendMessage: (text: string) => void;
}

const GameChat: React.FC<Props> = ({
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  }

  // ✅ Handle Enter key to send
  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="bg-elevated rounded-md p-4 flex flex-col h-full">
      {/* Header */}
      <h2 className="text-xl font-semibold mb-2">Chat</h2>

      {/* Chat messages - ✅ FIXED: Better scrolling and spacing */}
      <div className="flex-1 overflow-y-auto pr-2 border-t border-border-subtle pt-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-text-muted text-sm">No messages yet…</p>
        )}

        {messages.map((msg) => {
          const isMe = msg.userId === currentUserId;

          return (
            <div
              key={msg._id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                  isMe
                    ? "bg-[#2a5bd7] text-white" // Your messages: blue
                    : "bg-[#2a2f3b] text-text-primary" // Opponent: gray
                }`}
              >
                {/* ✅ Show username for opponent messages only */}
                {!isMe && (
                  <div className="text-xs text-text-muted mb-1 font-semibold">
                    {msg.username}
                  </div>
                )}
                {/* ✅ CRITICAL FIX: Add word-break and overflow-wrap */}
                <div className="break-words overflow-wrap-anywhere">
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input - ✅ FIXED: Better spacing and Enter key support */}
      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded bg-[#181b22] text-text-primary border border-border-subtle focus:outline-none focus:ring-1 focus:ring-[#4c89ff] text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message…"
          maxLength={500} // ✅ Prevent extremely long messages
        />

        <button
          className="px-4 py-2 bg-[#2a5bd7] text-white rounded hover:bg-[#3b6cf0] transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default GameChat;