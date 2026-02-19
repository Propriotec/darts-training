"use client";

import { AutoThrowEvent, SessionData } from "@/lib/darts/types";
import { CameraEngineActions, CameraEngineRefs, CameraEngineState } from "@/components/darts/camera/useCameraEngine";

export interface CameraSettings {
  state: CameraEngineState;
  actions: CameraEngineActions;
  refs: CameraEngineRefs;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export type GameComponentProps = {
  week: number;
  autoThrow: AutoThrowEvent | null;
  gameHistory?: SessionData[];
  onSave: (sessionData: SessionData) => void;
  onGameActiveChange?: (active: boolean) => void;
  onExit?: () => void;
  cameraSettings?: CameraSettings;
};

export type GameDefinition = {
  id: "tons" | "ladder" | "jdc" | "atc";
  label: string;
  tabColor: string;
  Component: React.ComponentType<GameComponentProps>;
};
