import { AppState, STORAGE_KEY, TrainingData, UserProfile, WeekSlots } from "@/lib/darts/types";

export const emptyWeek = (): WeekSlots => Array(7).fill(null);

export const emptyData = (): TrainingData => ({
  tons: [emptyWeek(), emptyWeek(), emptyWeek(), emptyWeek()],
  ladder: [emptyWeek(), emptyWeek(), emptyWeek(), emptyWeek()],
  jdc: [emptyWeek(), emptyWeek(), emptyWeek(), emptyWeek()],
  atc: [emptyWeek(), emptyWeek(), emptyWeek(), emptyWeek()],
});

const isTrainingData = (v: unknown): v is TrainingData => {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return Array.isArray(obj.tons) && Array.isArray(obj.ladder) && Array.isArray(obj.jdc);
};

const makeUserId = () => `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createUser = (name: string, data: TrainingData = emptyData()): UserProfile => ({
  id: makeUserId(),
  name: name.trim() || "Player",
  data,
  createdAt: Date.now(),
});

export const emptyState = (): AppState => {
  return { version: 2, activeUserId: "", users: [] };
};

export const getActiveUser = (state: AppState): UserProfile => {
  return state.users.find(u => u.id === state.activeUserId) ?? state.users[0];
};

const isAppState = (v: unknown): v is AppState => {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return obj.version === 2 && typeof obj.activeUserId === "string" && Array.isArray(obj.users);
};

export function loadState(): AppState {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (!r) return emptyState();
    const parsed = JSON.parse(r) as unknown;
    if (isAppState(parsed) && parsed.users.length > 0) {
      for (const u of parsed.users) {
        if (!u.data.atc) u.data.atc = [emptyWeek(), emptyWeek(), emptyWeek(), emptyWeek()];
      }
      return parsed;
    }
    // Migration from old single-user storage shape.
    if (isTrainingData(parsed)) {
      const migratedUser = createUser("Player 1", parsed);
      return { version: 2, activeUserId: migratedUser.id, users: [migratedUser] };
    }
    return emptyState();
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error(e);
  }
}
