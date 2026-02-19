import { GameDefinition } from "@/games/types";
import { atcGame } from "@/games/atc/AroundTheClockGame";
import { jdcGame } from "@/games/jdc/JdcGame";
import { ladderGame } from "@/games/ladder/LadderGame";
import { tonsGame } from "@/games/tons/TonsGame";

export const GAME_REGISTRY: GameDefinition[] = [tonsGame, ladderGame, jdcGame, atcGame];

export const getGameById = (id: string) => GAME_REGISTRY.find(g => g.id === id);
