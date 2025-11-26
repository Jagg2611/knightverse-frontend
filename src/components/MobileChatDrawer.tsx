// src/components/MobileChatDrawer.tsx
import React, { useState, useRef, useEffect } from 'react';

interface Message {
  _id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

interface MobileChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  currentUserId?: string;
  onSendMessage: (text: string) => void;
}

const MobileChatDrawer: React.FC<MobileChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[85vw] max-w-[400px] bg-[#151821] border-l border-[#2a3040] z-[101] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3040]">
          <h3 className="text-lg font-semibold">Chat</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#2a2f3b] transition"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 h-[calc(100vh-120px)]">
          {messages.length === 0 ? (
            <div className="text-center text-[#9ba2be] mt-8">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isMe = msg.userId === currentUserId;
                return (
                  <div
                    key={msg._id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        isMe
                          ? 'bg-[#49c85f] text-black'
                          : 'bg-[#2a2f3b] text-[#f5f7ff]'
                      }`}
                    >
                      {!isMe && (
                        <div className="text-xs font-semibold mb-1 opacity-70">
                          {msg.username}
                        </div>
                      )}
                      <div className="text-sm break-words">{msg.text}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#151821] border-t border-[#2a3040]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-[#0b0d12] border border-[#2a3040] rounded-lg text-sm focus:outline-none focus:border-[#49c85f] text-[#f5f7ff]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-4 py-2 bg-[#49c85f] hover:bg-[#3fb556] disabled:bg-[#2a2f3b] disabled:text-[#6b7183] disabled:cursor-not-allowed rounded-lg font-semibold transition text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileChatDrawer;