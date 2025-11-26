// src/lib/difficultyConfig.ts

export interface DifficultyLevel {
  level: number;
  name: string;
  description: string;
  elo: number;
  depth: number;
  thinkTime: number; // milliseconds
  mistakeRate: number; // 0-1, chance of making suboptimal move
  
  // For Stockfish hook
  stockfishSkillLevel: number; // 0-20
  stockfishDepth: number;
  moveTime: number; // milliseconds
}

export const DIFFICULTY_LEVELS: Record<number, DifficultyLevel> = {
  1: {
    level: 1,
    name: "Beginner",
    description: "Just learning the rules",
    elo: 400,
    depth: 2,
    thinkTime: 200,
    mistakeRate: 0.7,
    stockfishSkillLevel: 0,
    stockfishDepth: 1,
    moveTime: 200,
  },
  2: {
    level: 2,
    name: "Novice",
    description: "Knows basic tactics",
    elo: 800,
    depth: 2,
    thinkTime: 300,
    mistakeRate: 0.5,
    stockfishSkillLevel: 3,
    stockfishDepth: 2,
    moveTime: 300,
  },
  3: {
    level: 3,
    name: "Casual",
    description: "Weekend player",
    elo: 1000,
    depth: 3,
    thinkTime: 400,
    mistakeRate: 0.35,
    stockfishSkillLevel: 5,
    stockfishDepth: 3,
    moveTime: 400,
  },
  4: {
    level: 4,
    name: "Intermediate",
    description: "Club player",
    elo: 1200,
    depth: 3,
    thinkTime: 500,
    mistakeRate: 0.25,
    stockfishSkillLevel: 8,
    stockfishDepth: 5,
    moveTime: 500,
  },
  5: {
    level: 5,
    name: "Advanced",
    description: "Strong club player",
    elo: 1400,
    depth: 4,
    thinkTime: 600,
    mistakeRate: 0.15,
    stockfishSkillLevel: 10,
    stockfishDepth: 8,
    moveTime: 600,
  },
  6: {
    level: 6,
    name: "Expert",
    description: "Tournament player",
    elo: 1600,
    depth: 4,
    thinkTime: 700,
    mistakeRate: 0.10,
    stockfishSkillLevel: 12,
    stockfishDepth: 10,
    moveTime: 700,
  },
  7: {
    level: 7,
    name: "Master",
    description: "FIDE Master level",
    elo: 1800,
    depth: 5,
    thinkTime: 800,
    mistakeRate: 0.05,
    stockfishSkillLevel: 15,
    stockfishDepth: 12,
    moveTime: 800,
  },
  8: {
    level: 8,
    name: "International Master",
    description: "IM level play",
    elo: 2000,
    depth: 5,
    thinkTime: 900,
    mistakeRate: 0.02,
    stockfishSkillLevel: 17,
    stockfishDepth: 15,
    moveTime: 900,
  },
  9: {
    level: 9,
    name: "Grandmaster",
    description: "GM level play",
    elo: 2200,
    depth: 6,
    thinkTime: 1000,
    mistakeRate: 0.01,
    stockfishSkillLevel: 19,
    stockfishDepth: 18,
    moveTime: 1000,
  },
  10: {
    level: 10,
    name: "Maximum",
    description: "Superhuman strength",
    elo: 2800,
    depth: 6,
    thinkTime: 1200,
    mistakeRate: 0,
    stockfishSkillLevel: 20,
    stockfishDepth: 20,
    moveTime: 1500,
  },
};