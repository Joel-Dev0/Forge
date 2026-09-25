import { create } from "zustand";
import { SOCIAL_PLATFORMS, type FocusActionTier } from "./socialRulesets";
import { playFocusAlarmSound } from "./focusAlarm";
import { generateSeedSessions, toLocalDateString } from "./focusAnalytics";

export interface FocusSchedule {
  id: string;
  name: string;
  days: number[]; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number; // 0-23
  endMinute: number; // 0-59
  enabled: boolean;
  profileId: string;
}

export interface FocusProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  tiers: Record<string, FocusActionTier>; // platformId -> tier
}

export interface FocusSessionLog {
  id: string;
  dateStr: string; // "YYYY-MM-DD"
  timestamp: number;
  durationMinutes: number;
  phase: "focus" | "break";
  profileId: string;
  category: "Development" | "Research" | "Checklist" | "Deep Work";
  completed: boolean;
}

export interface FocusTimer {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  phase: "focus" | "break";
  mode: "pomodoro" | "duration" | "indefinite";
  focusDurationMinutes: number; // default 25
  breakDurationMinutes: number; // default 5
  alarmSoundEnabled: boolean; // default true
}

export interface FocusAlarmEvent {
  phase: "focus" | "break";
  timestamp: number;
  message: string;
}

interface FocusState {
  isFocusModeActive: boolean;
  manualOverrideOff: boolean;
  activeProfileId: string;
  timer: FocusTimer;
  profiles: Record<string, FocusProfile>;
  schedules: FocusSchedule[];
  isFocusModalOpen: boolean;
  lastAlarmTriggered: FocusAlarmEvent | null;
  sessionLogs: FocusSessionLog[];

  setFocusModalOpen: (open: boolean) => void;
  toggleFocusMode: () => void;
  setFocusMode: (active: boolean) => void;
  setActiveProfile: (profileId: string) => void;
  setPlatformTier: (profileId: string, platformId: string, tier: FocusActionTier) => void;

  // Timer controls & Custom Durations
  startTimer: (minutes?: number, mode?: "pomodoro" | "duration" | "indefinite") => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tickTimer: () => void;
  dismissAlarm: () => void;
  toggleAlarmSound: () => void;
  setCustomFocusDuration: (minutes: number) => void;
  setCustomBreakDuration: (minutes: number) => void;
  setTimerMode: (mode: "pomodoro" | "duration" | "indefinite") => void;

  // Session analytics logging
  logSession: (session: Omit<FocusSessionLog, "id" | "timestamp" | "dateStr">) => void;
  clearSessionLogs: () => void;

  // Schedule management
  addSchedule: (schedule: Omit<FocusSchedule, "id">) => void;
  updateSchedule: (id: string, patch: Partial<FocusSchedule>) => void;
  deleteSchedule: (id: string) => void;
  toggleSchedule: (id: string) => void;
  checkAutomatedSchedules: () => void;

  // Helpers
  getActiveProfile: () => FocusProfile;
  getTierForDomain: (domain: string) => FocusActionTier;
}

const STORAGE_KEY = "forge_focus_store_v4";

const DEFAULT_PROFILES: Record<string, FocusProfile> = {
  deep_work: {
    id: "deep_work",
    name: "Deep Work",
    description: "Maximum concentration. Blocks all social feeds, limits YouTube strictly to tutorial/video views.",
    icon: "Brain",
    tiers: {
      youtube: "LIMIT",
      twitter: "BLOCK",
      instagram: "BLOCK",
      tiktok: "BLOCK",
      reddit: "BLOCK",
      linkedin: "HIDE_DISTRACTIONS",
      facebook: "BLOCK",
    },
  },
  study: {
    id: "study",
    name: "Study & Research",
    description: "Allows research on Reddit & YouTube, hides all comments, infinite feeds, and recommendations.",
    icon: "GraduationCap",
    tiers: {
      youtube: "LIMIT",
      twitter: "BLOCK",
      instagram: "BLOCK",
      tiktok: "BLOCK",
      reddit: "LIMIT",
      linkedin: "HIDE_DISTRACTIONS",
      facebook: "BLOCK",
    },
  },
  minimal: {
    id: "minimal",
    name: "Distraction-Free",
    description: "Allows all sites but cosmetically strips away infinite feeds, trending tabs, and notification reels.",
    icon: "Sliders",
    tiers: {
      youtube: "HIDE_DISTRACTIONS",
      twitter: "HIDE_DISTRACTIONS",
      instagram: "HIDE_DISTRACTIONS",
      tiktok: "BLOCK",
      reddit: "HIDE_DISTRACTIONS",
      linkedin: "HIDE_DISTRACTIONS",
      facebook: "HIDE_DISTRACTIONS",
    },
  },
};

const DEFAULT_SCHEDULES: FocusSchedule[] = [
  {
    id: "sched_workday",
    name: "Work Hours (Mon-Fri)",
    days: [1, 2, 3, 4, 5], // Mon to Fri
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    enabled: false,
    profileId: "deep_work",
  },
];

function loadSavedFocusState(): {
  isFocusModeActive: boolean;
  activeProfileId: string;
  profiles: Record<string, FocusProfile>;
  schedules: FocusSchedule[];
  timerConfig: { focusDurationMinutes: number; breakDurationMinutes: number };
  sessionLogs: FocusSessionLog[];
} {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return {
        isFocusModeActive: false,
        activeProfileId: "deep_work",
        profiles: DEFAULT_PROFILES,
        schedules: DEFAULT_SCHEDULES,
        timerConfig: { focusDurationMinutes: 25, breakDurationMinutes: 5 },
        sessionLogs: generateSeedSessions(),
      };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        isFocusModeActive: false,
        activeProfileId: "deep_work",
        profiles: DEFAULT_PROFILES,
        schedules: DEFAULT_SCHEDULES,
        timerConfig: { focusDurationMinutes: 25, breakDurationMinutes: 5 },
        sessionLogs: generateSeedSessions(),
      };
    }
    const parsed = JSON.parse(raw);
    return {
      isFocusModeActive: false,
      activeProfileId: parsed.activeProfileId || "deep_work",
      profiles: parsed.profiles || DEFAULT_PROFILES,
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : DEFAULT_SCHEDULES,
      timerConfig: {
        focusDurationMinutes: parsed.timerConfig?.focusDurationMinutes || 25,
        breakDurationMinutes: parsed.timerConfig?.breakDurationMinutes || 5,
      },
      sessionLogs: Array.isArray(parsed.sessionLogs) && parsed.sessionLogs.length > 0
        ? parsed.sessionLogs
        : generateSeedSessions(),
    };
  } catch {}
  return {
    isFocusModeActive: false,
    activeProfileId: "deep_work",
    profiles: DEFAULT_PROFILES,
    schedules: DEFAULT_SCHEDULES,
    timerConfig: { focusDurationMinutes: 25, breakDurationMinutes: 5 },
    sessionLogs: generateSeedSessions(),
  };
}

function persistFocusState(
  isFocusModeActive: boolean,
  activeProfileId: string,
  profiles: Record<string, FocusProfile>,
  schedules: FocusSchedule[],
  timerConfig: { focusDurationMinutes: number; breakDurationMinutes: number },
  sessionLogs?: FocusSessionLog[]
) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isFocusModeActive,
          activeProfileId,
          profiles,
          schedules,
          timerConfig,
          sessionLogs: sessionLogs || useFocusStore.getState().sessionLogs,
        })
      );
    }
    // Sync state to Electron main process
    (window as any).forge?.focus?.syncState?.({
      isActive: isFocusModeActive,
      profile: profiles[activeProfileId] || DEFAULT_PROFILES.deep_work,
    });
  } catch {}
}

const initial = loadSavedFocusState();

export const useFocusStore = create<FocusState>((set, get) => ({
  isFocusModeActive: initial.isFocusModeActive,
  manualOverrideOff: false,
  activeProfileId: initial.activeProfileId,
  isFocusModalOpen: false,
  lastAlarmTriggered: null,
  profiles: initial.profiles,
  schedules: initial.schedules,
  sessionLogs: initial.sessionLogs,

  logSession(session) {
    const dateStr = toLocalDateString(new Date());
    const newLog: FocusSessionLog = {
      ...session,
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dateStr,
      timestamp: Date.now(),
    };
    const nextLogs = [newLog, ...get().sessionLogs];
    set({ sessionLogs: nextLogs });
    persistFocusState(
      get().isFocusModeActive,
      get().activeProfileId,
      get().profiles,
      get().schedules,
      {
        focusDurationMinutes: get().timer.focusDurationMinutes,
        breakDurationMinutes: get().timer.breakDurationMinutes,
      },
      nextLogs
    );
  },

  clearSessionLogs() {
    set({ sessionLogs: [] });
    persistFocusState(
      get().isFocusModeActive,
      get().activeProfileId,
      get().profiles,
      get().schedules,
      {
        focusDurationMinutes: get().timer.focusDurationMinutes,
        breakDurationMinutes: get().timer.breakDurationMinutes,
      },
      []
    );
  },

  timer: {
    isRunning: false,
    remainingSeconds: initial.timerConfig.focusDurationMinutes * 60,
    totalSeconds: initial.timerConfig.focusDurationMinutes * 60,
    phase: "focus",
    mode: "pomodoro",
    focusDurationMinutes: initial.timerConfig.focusDurationMinutes,
    breakDurationMinutes: initial.timerConfig.breakDurationMinutes,
    alarmSoundEnabled: true,
  },

  setFocusModalOpen(open) {
    set({ isFocusModalOpen: open });
  },

  dismissAlarm() {
    set({ lastAlarmTriggered: null });
  },

  toggleAlarmSound() {
    set((s) => ({
      timer: {
        ...s.timer,
        alarmSoundEnabled: !s.timer.alarmSoundEnabled,
      },
    }));
  },

  toggleFocusMode() {
    const next = !get().isFocusModeActive;
    get().setFocusMode(next);
  },

  setFocusMode(active) {
    if (!active) {
      set((s) => ({
        isFocusModeActive: false,
        manualOverrideOff: true,
        timer: {
          ...s.timer,
          isRunning: false,
          remainingSeconds: s.timer.focusDurationMinutes * 60,
          totalSeconds: s.timer.focusDurationMinutes * 60,
          phase: "focus",
        },
      }));
    } else {
      set({
        isFocusModeActive: true,
        manualOverrideOff: false,
      });
    }

    const { activeProfileId, profiles, schedules, timer } = get();
    persistFocusState(active, activeProfileId, profiles, schedules, {
      focusDurationMinutes: timer.focusDurationMinutes,
      breakDurationMinutes: timer.breakDurationMinutes,
    });

    // Orchestrate Focus Player
    try {
      import("./useFocusPlayerStore").then((m) => {
        if (active) {
          m.useFocusPlayerStore.getState().triggerProfileAutoPlay(activeProfileId);
        } else {
          m.useFocusPlayerStore.getState().pause();
        }
      });
    } catch {}
  },

  setActiveProfile(profileId) {
    if (!get().profiles[profileId]) return;
    set({ activeProfileId: profileId });
    const { isFocusModeActive, profiles, schedules, timer } = get();
    persistFocusState(isFocusModeActive, profileId, profiles, schedules, {
      focusDurationMinutes: timer.focusDurationMinutes,
      breakDurationMinutes: timer.breakDurationMinutes,
    });

    if (isFocusModeActive) {
      try {
        import("./useFocusPlayerStore").then((m) => {
          m.useFocusPlayerStore.getState().triggerProfileAutoPlay(profileId);
        });
      } catch {}
    }
  },

  setPlatformTier(profileId, platformId, tier) {
    set((s) => {
      const profile = s.profiles[profileId];
      if (!profile) return s;
      const nextProfiles = {
        ...s.profiles,
        [profileId]: {
          ...profile,
          tiers: {
            ...profile.tiers,
            [platformId]: tier,
          },
        },
      };
      persistFocusState(s.isFocusModeActive, s.activeProfileId, nextProfiles, s.schedules, {
        focusDurationMinutes: s.timer.focusDurationMinutes,
        breakDurationMinutes: s.timer.breakDurationMinutes,
      });
      return { profiles: nextProfiles };
    });
  },

  startTimer(minutes, mode = "pomodoro") {
    const durMinutes = minutes || get().timer.focusDurationMinutes;
    const totalSec = durMinutes * 60;
    set((s) => ({
      isFocusModeActive: true,
      manualOverrideOff: false,
      lastAlarmTriggered: null,
      timer: {
        ...s.timer,
        isRunning: true,
        remainingSeconds: totalSec,
        totalSeconds: totalSec,
        phase: "focus",
        mode,
        focusDurationMinutes: durMinutes,
      },
    }));
    persistFocusState(true, get().activeProfileId, get().profiles, get().schedules, {
      focusDurationMinutes: durMinutes,
      breakDurationMinutes: get().timer.breakDurationMinutes,
    });

    try {
      import("./useFocusPlayerStore").then((m) => {
        m.useFocusPlayerStore.getState().triggerProfileAutoPlay(get().activeProfileId);
      });
    } catch {}
  },

  pauseTimer() {
    set((s) => ({
      timer: { ...s.timer, isRunning: false },
    }));
  },

  resumeTimer() {
    set((s) => ({
      isFocusModeActive: true,
      manualOverrideOff: false,
      timer: { ...s.timer, isRunning: true },
    }));
  },

  stopTimer() {
    set((s) => ({
      isFocusModeActive: false,
      manualOverrideOff: true,
      timer: {
        ...s.timer,
        isRunning: false,
        remainingSeconds: s.timer.focusDurationMinutes * 60,
        totalSeconds: s.timer.focusDurationMinutes * 60,
        phase: "focus",
      },
    }));
    persistFocusState(false, get().activeProfileId, get().profiles, get().schedules, {
      focusDurationMinutes: get().timer.focusDurationMinutes,
      breakDurationMinutes: get().timer.breakDurationMinutes,
    });

    try {
      import("./useFocusPlayerStore").then((m) => {
        m.useFocusPlayerStore.getState().pause();
      });
    } catch {}
  },

  setCustomFocusDuration(minutes: number) {
    const clamped = Math.max(1, Math.min(360, Math.round(minutes)));
    const totalSec = clamped * 60;
    set((s) => ({
      timer: {
        ...s.timer,
        focusDurationMinutes: clamped,
        remainingSeconds: !s.timer.isRunning ? totalSec : s.timer.remainingSeconds,
        totalSeconds: !s.timer.isRunning ? totalSec : s.timer.totalSeconds,
      },
    }));
    persistFocusState(get().isFocusModeActive, get().activeProfileId, get().profiles, get().schedules, {
      focusDurationMinutes: clamped,
      breakDurationMinutes: get().timer.breakDurationMinutes,
    });
  },

  setCustomBreakDuration(minutes: number) {
    const clamped = Math.max(1, Math.min(60, Math.round(minutes)));
    set((s) => ({
      timer: {
        ...s.timer,
        breakDurationMinutes: clamped,
      },
    }));
    persistFocusState(get().isFocusModeActive, get().activeProfileId, get().profiles, get().schedules, {
      focusDurationMinutes: get().timer.focusDurationMinutes,
      breakDurationMinutes: clamped,
    });
  },

  setTimerMode(mode) {
    set((s) => ({
      timer: {
        ...s.timer,
        mode,
      },
    }));
  },

  tickTimer() {
    const { timer } = get();
    if (!timer.isRunning) return;

    if (timer.remainingSeconds <= 1) {
      const isFocus = timer.phase === "focus";
      const alarmType = isFocus ? "focus_complete" : "break_complete";

      // Synthesize audible alarm sound immediately
      if (timer.alarmSoundEnabled) {
        playFocusAlarmSound(alarmType).catch(() => {});
      }

      const alarmMessage = isFocus
        ? "🎯 Focus countdown ended! Fantastic work."
        : "☕ Break countdown ended! Ready to focus again?";

      set({
        lastAlarmTriggered: {
          phase: timer.phase,
          timestamp: Date.now(),
          message: alarmMessage,
        },
      });

      // Log real session analytics
      if (isFocus) {
        get().logSession({
          durationMinutes: timer.focusDurationMinutes,
          phase: "focus",
          profileId: get().activeProfileId,
          category: "Deep Work",
          completed: true,
        });
      }

      if (timer.mode === "pomodoro") {
        const nextPhase = isFocus ? "break" : "focus";
        const nextMinutes =
          nextPhase === "focus" ? timer.focusDurationMinutes : timer.breakDurationMinutes;
        const nextSec = nextMinutes * 60;
        set((s) => ({
          isFocusModeActive: nextPhase === "focus",
          timer: {
            ...s.timer,
            phase: nextPhase,
            remainingSeconds: nextSec,
            totalSeconds: nextSec,
          },
        }));

        try {
          new Notification(alarmMessage);
        } catch {}
      } else {
        // Duration mode finished
        get().stopTimer();
      }
    } else {
      set({
        timer: {
          ...timer,
          remainingSeconds: timer.remainingSeconds - 1,
        },
      });
    }
  },

  addSchedule(schedule) {
    const id = `sched_${Date.now()}`;
    const newSchedule: FocusSchedule = { ...schedule, id };
    const nextSchedules = [...get().schedules, newSchedule];
    set({ schedules: nextSchedules });
    persistFocusState(
      get().isFocusModeActive,
      get().activeProfileId,
      get().profiles,
      nextSchedules,
      {
        focusDurationMinutes: get().timer.focusDurationMinutes,
        breakDurationMinutes: get().timer.breakDurationMinutes,
      }
    );
  },

  updateSchedule(id, patch) {
    const nextSchedules = get().schedules.map((s) => (s.id === id ? { ...s, ...patch } : s));
    set({ schedules: nextSchedules });
    persistFocusState(
      get().isFocusModeActive,
      get().activeProfileId,
      get().profiles,
      nextSchedules,
      {
        focusDurationMinutes: get().timer.focusDurationMinutes,
        breakDurationMinutes: get().timer.breakDurationMinutes,
      }
    );
  },

  deleteSchedule(id) {
    const nextSchedules = get().schedules.filter((s) => s.id !== id);
    set({ schedules: nextSchedules });
    persistFocusState(
      get().isFocusModeActive,
      get().activeProfileId,
      get().profiles,
      nextSchedules,
      {
        focusDurationMinutes: get().timer.focusDurationMinutes,
        breakDurationMinutes: get().timer.breakDurationMinutes,
      }
    );
  },

  toggleSchedule(id) {
    const target = get().schedules.find((s) => s.id === id);
    if (!target) return;
    get().updateSchedule(id, { enabled: !target.enabled });
  },

  checkAutomatedSchedules() {
    // If the user explicitly turned off Focus Mode, never force it back on!
    if (get().manualOverrideOff) return;

    const now = new Date();
    const day = now.getDay();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let matchedProfileId: string | null = null;
    for (const sched of get().schedules) {
      if (!sched.enabled) continue;
      if (!sched.days.includes(day)) continue;
      const startMins = sched.startHour * 60 + sched.startMinute;
      const endMins = sched.endHour * 60 + sched.endMinute;
      if (currentMins >= startMins && currentMins < endMins) {
        matchedProfileId = sched.profileId;
        break;
      }
    }

    if (matchedProfileId) {
      if (!get().isFocusModeActive || get().activeProfileId !== matchedProfileId) {
        set({ isFocusModeActive: true, activeProfileId: matchedProfileId });
        persistFocusState(true, matchedProfileId, get().profiles, get().schedules, {
          focusDurationMinutes: get().timer.focusDurationMinutes,
          breakDurationMinutes: get().timer.breakDurationMinutes,
        });
      }
    }
  },

  getActiveProfile() {
    const { profiles, activeProfileId } = get();
    return profiles[activeProfileId] || DEFAULT_PROFILES.deep_work;
  },

  getTierForDomain(domain: string) {
    if (!get().isFocusModeActive) return "ALLOW";
    const clean = domain.toLowerCase().replace(/^(www\.|m\.)/, "");
    const profile = get().getActiveProfile();
    for (const [platformId, platform] of Object.entries(SOCIAL_PLATFORMS)) {
      if (platform.domains.some((d) => clean === d || clean.endsWith("." + d))) {
        return profile.tiers[platformId] || platform.defaultTier;
      }
    }
    return "ALLOW";
  },
}));
