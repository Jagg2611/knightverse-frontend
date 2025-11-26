// src/components/ThinkingIndicator.tsx

import React from "react";

interface ThinkingIndicatorProps {
  aiName: string;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ aiName }) => {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
      </div>
      <span className="text-sm text-text-muted font-medium">
        {aiName} is thinking...
      </span>
    </div>
  );
};

export default ThinkingIndicator;