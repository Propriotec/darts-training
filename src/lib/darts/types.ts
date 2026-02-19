export type GameTab = "tons" | "ladder" | "jdc" | "atc";

export type Multiplier = 0 | 1 | 2 | 3;
export type BoardNumber = number | "Bull" | null;

export type DetectedHit = {
  number: BoardNumber;
  multiplier: Multiplier;
  confidence: number;
};

export type AutoThrowEvent = {
  id: number;
  game: GameTab;
  hit: DetectedHit;
};

export type SessionData = Record<string, unknown>;

export type WeekSlots = Array<SessionData | null>;

export type TrainingData = {
  tons: WeekSlots[];
  ladder: WeekSlots[];
  jdc: WeekSlots[];
  atc: WeekSlots[];
};

export type UserProfile = {
  id: string;
  name: string;
  data: TrainingData;
  createdAt: number;
};

export type AppState = {
  version: 2;
  activeUserId: string;
  users: UserProfile[];
};

export const STORAGE_KEY = "darts-plan-one";
export const LADDER: Record<number, number> = { 1: 40, 2: 50, 3: 60, 4: 70 };
