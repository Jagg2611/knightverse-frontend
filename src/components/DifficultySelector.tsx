// src/components/DifficultySelector.tsx

import React from "react";
import { DIFFICULTY_LEVELS } from "../lib/difficultyConfig";

interface DifficultySelectorProps {
  selectedLevel: number;
  onSelect: (level: number) => void;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  selectedLevel,
  onSelect,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">
        Choose Difficulty
      </h2>
      <p className="text-sm text-text-muted mb-6 text-center">
        Select AI strength from beginner to superhuman
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.values(DIFFICULTY_LEVELS).map((level) => (
          <button
            key={level.level}
            onClick={() => onSelect(level.level)}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200
              ${
                selectedLevel === level.level
                  ? "border-accent bg-accent/10 shadow-lg scale-105"
                  : "border-border-subtle bg-elevated hover:border-accent/50 hover:scale-102"
              }
            `}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl font-bold text-accent">
                {level.level}
              </div>
              <div className="text-sm font-semibold text-text-primary">
                {level.name}
              </div>
              <div className="text-xs text-text-muted text-center">
                {level.description}
              </div>
              <div className="text-xs font-mono text-text-muted">
                ELO: {level.elo}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedLevel > 0 && (
        <div className="mt-6 p-4 bg-elevated rounded-lg border border-border-subtle">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-text-primary">
                {DIFFICULTY_LEVELS[selectedLevel].name}
              </div>
              <div className="text-sm text-text-muted">
                {DIFFICULTY_LEVELS[selectedLevel].description}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-accent">
                {DIFFICULTY_LEVELS[selectedLevel].elo}
              </div>
              <div className="text-xs text-text-muted">Rating</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DifficultySelector;