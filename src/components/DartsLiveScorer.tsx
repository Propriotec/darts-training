"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useCameraEngine } from "@/components/darts/camera/useCameraEngine";
import { History } from "@/components/darts/history/History";
import { LoginPage } from "@/components/darts/profile/LoginPage";
import { ProfilePage } from "@/components/darts/profile/ProfilePage";
import { StatsPage } from "@/components/darts/stats/StatsPage";
import { GAME_REGISTRY, getGameById } from "@/games";
import { CameraSettings } from "@/games/types";
import { createUser, emptyData, emptyState, emptyWeek, getActiveUser, loadState, saveState } from "@/lib/darts/storage";
import { AppState, AutoThrowEvent, GameTab, SessionData, TrainingData, UserProfile } from "@/lib/darts/types";

type ScreenTab = "play" | "history" | "stats" | "profile";
const UI_STATE_KEY = "darts_live_ui_state_v1";


export default function DartsLiveScorer() {
  const [screen, setScreen] = useState<ScreenTab>("play");
  const [gameTab, setGameTab] = useState<GameTab | null>(null);
  const [appState, setAppState] = useState<AppState>(emptyState());
  const [loaded, setLoaded] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [autoThrow, setAutoThrow] = useState<AutoThrowEvent | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  // Headless camera engine
  const camera = useCameraEngine(gameTab ?? "tons", gameActive && cameraEnabled, setAutoThrow);

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        const lock = await navigator.wakeLock.request("screen");
        setWakeLock(lock);
        lock.addEventListener("release", () => { setWakeLock(null); });
      }
    } catch (e) {
      console.log("Wake lock failed:", e);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
    }
  };

  useEffect(() => {
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const persisted = loadState();
    setAppState(persisted);
    setSessionUserId(persisted.activeUserId || persisted.users[0]?.id || null);

    try {
      const rawUi = localStorage.getItem(UI_STATE_KEY);
      if (!rawUi) {
        setLoaded(true);
        return;
      }
      const parsed = JSON.parse(rawUi) as { screen?: ScreenTab; gameTab?: GameTab | null };
      if (parsed.screen && ["play", "history", "stats", "profile"].includes(parsed.screen)) {
        setScreen(parsed.screen);
      }
      if (parsed.gameTab === null || (parsed.gameTab && GAME_REGISTRY.some((g) => g.id === parsed.gameTab))) {
        setGameTab(parsed.gameTab ?? null);
      }
    } catch {
      // Ignore invalid UI state and keep defaults.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(UI_STATE_KEY, JSON.stringify({ screen, gameTab }));
    } catch {
      // Best effort persistence.
    }
  }, [loaded, screen, gameTab]);

  const activeUser = useMemo(() => {
    if (!sessionUserId) return null;
    return appState.users.find(u => u.id === sessionUserId) ?? null;
  }, [appState.users, sessionUserId]);

  const activeUserSafe: UserProfile | null = activeUser ?? getActiveUser(appState) ?? null;
  const data: TrainingData = activeUser?.data ?? emptyData();

  const persist = (next: AppState) => {
    setAppState(next);
    saveState(next);
  };

  const switchUser = (userId: string) => {
    const nextState = { ...appState, activeUserId: userId };
    persist(nextState);
    setSessionUserId(userId);
  };

  const logout = () => {
    const nextState: AppState = { ...appState, activeUserId: "" };
    persist(nextState);
    setSessionUserId(null);
  };

  const addUser = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const user = createUser(clean);
    const nextState: AppState = {
      ...appState,
      activeUserId: user.id,
      users: [...appState.users, user],
    };
    persist(nextState);
    setSessionUserId(user.id);
  };

  const renameActiveUser = (name: string) => {
    const clean = name.trim();
    if (!clean || !activeUser) return;
    const nextState: AppState = {
      ...appState,
      users: appState.users.map((u) => (u.id === activeUser.id ? { ...u, name: clean } : u)),
    };
    persist(nextState);
  };

  const deleteActiveUser = () => {
    if (!activeUser || appState.users.length <= 1) return;
    const users = appState.users.filter((u) => u.id !== activeUser.id);
    const fallback = users[0];
    if (!fallback) return;
    const nextState: AppState = { ...appState, users, activeUserId: fallback.id };
    persist(nextState);
    setSessionUserId(fallback.id);
  };

  const clearAll = () => {
    if (!activeUser) return;
    const nd = emptyData();
    const nextState: AppState = {
      ...appState,
      users: appState.users.map(u => (u.id === activeUser.id ? { ...u, data: nd } : u)),
    };
    persist(nextState);
  };

  const addSession = (game: GameTab, sessionData: SessionData) => {
    if (!activeUser) return;
    const nd: TrainingData = JSON.parse(JSON.stringify(data));
    const wi = 0;
    const slot = nd[game][wi].findIndex((d: SessionData | null) => d === null);
    if (slot === -1) {
      nd[game][0] = nd[game][1];
      nd[game][1] = nd[game][2];
      nd[game][2] = nd[game][3];
      nd[game][3] = emptyWeek();
      nd[game][3][0] = sessionData;
    } else {
      nd[game][wi][slot] = sessionData;
    }
    const nextState: AppState = {
      ...appState,
      users: appState.users.map(u => (u.id === activeUser.id ? { ...u, data: nd } : u)),
    };
    persist(nextState);
  };


  const activeGame = useMemo(() => gameTab ? getGameById(gameTab) : undefined, [gameTab]);
  const gameLive = screen === "play" && gameActive;

  useEffect(() => {
    setGameActive(false);
  }, [screen, gameTab]);

  const handleGameExit = () => {
    setGameActive(false);
    setGameTab(null);
  };

  const cameraSettings: CameraSettings = {
    state: camera.state,
    actions: camera.actions,
    refs: camera.refs,
    enabled: cameraEnabled,
    setEnabled: setCameraEnabled,
  };

  if (!loaded) {
    return <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020617", color: "#9ca3af" }}>Loading...</div>;
  }

  if (!sessionUserId || !activeUserSafe || !activeUser) {
    return <LoginPage users={appState.users} onSelect={switchUser} onCreate={addUser} />;
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0f1a", display: "flex", justifyContent: "center" }}>
      <div ref={shellRef} style={{ width: "100%", minHeight: "100dvh", background: "#0f172a" }}>
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh", boxShadow: gameLive ? "none" : "0 8px 30px rgba(0,0,0,0.22)" }}>

        {/* Hidden video/canvas for tons camera engine */}
        <video ref={camera.refs.videoRef} muted playsInline style={{ width: 1, height: 1, opacity: 0, position: "absolute", pointerEvents: "none" }} />
        <canvas ref={camera.refs.canvasRef} style={{ display: "none" }} />

        {!gameLive && (
        <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1f2937 100%)", padding: "14px 12px 12px", position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 900, letterSpacing: 0.8 }}>Darts Live</div>
          </div>
          <div style={{ marginTop: 8, textAlign: "center", color: "#9ca3af", fontSize: 11, fontWeight: 700 }}>Player: {activeUser.name}</div>
        </div>
        )}

        <div style={{ padding: 10, paddingBottom: gameLive ? 10 : 80 }}>
          {screen === "play" && !gameTab && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {GAME_REGISTRY.map(g => {
                const sessions = data[g.id].flat().filter((v): v is SessionData => v !== null).length;
                return (
                  <button key={g.id} onClick={() => setGameTab(g.id)} style={{
                    border: `1px solid ${g.tabColor}55`, borderRadius: 16, padding: 20, cursor: "pointer",
                    background: "#111827",
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                    textAlign: "left",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: g.tabColor }} />
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
                      {sessions > 0 ? `${sessions} session${sessions !== 1 ? "s" : ""}` : "No sessions yet"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {screen === "play" && gameTab && !gameLive && (
            <div style={{ marginBottom: 10 }}>
              <button onClick={() => { setGameTab(null); setGameActive(false); }} style={{
                border: "none", background: "rgba(255,255,255,0.08)", color: "#9ca3af",
                borderRadius: 10, fontSize: 12, fontWeight: 700, padding: "7px 12px", cursor: "pointer",
              }}>
                &larr; Games
              </button>
            </div>
          )}

          {screen === "play" && activeGame && (
            <activeGame.Component
              week={1}
              autoThrow={autoThrow}
              gameHistory={data[activeGame.id].flat().filter((v): v is SessionData => v !== null)}
              onSave={(sessionData) => addSession(activeGame.id, sessionData)}
              onGameActiveChange={setGameActive}
              onExit={handleGameExit}
              cameraSettings={cameraSettings}
            />
          )}

          {screen === "history" && <History data={data} />}
          {screen === "stats" && <StatsPage data={data} />}
          {screen === "profile" && (
            <ProfilePage
              users={appState.users}
              activeUser={activeUser}
              onSwitchUser={switchUser}
              onCreateUser={addUser}
              onRenameActive={renameActiveUser}
              onDeleteActive={() => {
                if (confirm(`Delete player ${activeUser.name}? This removes all stats.`)) deleteActiveUser();
              }}
              onClearActiveData={() => {
                if (confirm(`Clear all saved data for ${activeUser.name}?`)) clearAll();
              }}
              onLogout={logout}
            />
          )}
        </div>

        {/* Bottom nav bar */}
        {!gameLive && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
            background: "#0f172a", borderTop: "1px solid #1f2937",
            padding: "6px 0 env(safe-area-inset-bottom, 8px)",
          }}>
            <div style={{ maxWidth: 430, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0 }}>
              {([
                { id: "play" as ScreenTab, label: "Play", icon: "\u25B6" },
                { id: "history" as ScreenTab, label: "History", icon: "\u23F0" },
                { id: "stats" as ScreenTab, label: "Stats", icon: "\u2191" },
                { id: "profile" as ScreenTab, label: "Profile", icon: "\u2022" },
              ]).map(tab => (
                <button key={tab.id} onClick={() => setScreen(tab.id)} style={{
                  border: "none", background: "transparent", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  padding: "8px 0",
                  color: screen === tab.id ? "#fff" : "#6b7280",
                }}>
                  <span style={{ fontSize: 18 }}>{tab.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
