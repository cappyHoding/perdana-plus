import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Rekening, Grade, Hadiah, Winner, AppState, UndianEvent } from '../types';
import { uid } from '../utils/helpers';
import { idbStorage } from '../utils/idbStorage';

interface AppStore extends AppState {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  // Rekening
  addRekening: (r: Omit<Rekening, 'id'>) => void;
  updateRekening: (id: string, r: Partial<Rekening>) => void;
  deleteRekening: (id: string) => void;
  setRekening: (reks: Rekening[]) => void;
  // Grades
  addGrade: (g: Omit<Grade, 'id'>) => void;
  updateGrade: (id: string, g: Partial<Grade>) => void;
  deleteGrade: (id: string) => void;
  // Hadiah
  addHadiah: (h: Omit<Hadiah, 'id'>) => void;
  updateHadiah: (id: string, h: Partial<Hadiah>) => void;
  deleteHadiah: (id: string) => void;
  setHadiah: (hadiah: Hadiah[]) => void;
  // Winners
  addWinner: (w: Winner) => void;
  clearHistory: () => void;
  // Settings
  updateSettings: (s: Partial<Pick<AppState, 'period' | 'password' | 'audio'>>) => void;
  resetAll: () => void;
  importState: (s: Partial<AppState>) => void;
  // Events
  addEvent: (name: string, period: string) => void;
  switchEvent: (id: string) => void;
  updateEventMeta: (id: string, meta: { name?: string; period?: string }) => void;
  deleteEvent: (id: string) => void;
}

const defaultState: AppState = {
  password: 'perdana2026',
  audio: true,
  activeEventId: '',
  events: [],
  period: 'Tahun 2026',
  rekening: [],
  grades: [],
  hadiah: [],
  history: [],
};

function getAuthFromSession(): boolean {
  try { return sessionStorage.getItem('perdana-auth') === '1'; }
  catch { return false; }
}

function setAuthInSession(v: boolean) {
  try {
    if (v) sessionStorage.setItem('perdana-auth', '1');
    else sessionStorage.removeItem('perdana-auth');
  } catch { /* ignore */ }
}

// Sync one field of the active event inside the events array
function syncEvent(
  s: AppStore,
  data: Partial<Pick<UndianEvent, 'rekening' | 'grades' | 'hadiah' | 'history'>>,
) {
  return s.events.map(e => e.id === s.activeEventId ? { ...e, ...data } : e);
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      isAuthenticated: getAuthFromSession(),

      login(password) {
        if (password === get().password) {
          setAuthInSession(true);
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout() {
        setAuthInSession(false);
        set({ isAuthenticated: false });
      },

      addRekening(r) {
        set(s => {
          const rekening = [...s.rekening, { ...r, id: uid() }];
          return { rekening, events: syncEvent(s, { rekening }) };
        });
      },
      updateRekening(id, r) {
        set(s => {
          const rekening = s.rekening.map(x => x.id === id ? { ...x, ...r } : x);
          return { rekening, events: syncEvent(s, { rekening }) };
        });
      },
      deleteRekening(id) {
        set(s => {
          const rekening = s.rekening.filter(x => x.id !== id);
          return { rekening, events: syncEvent(s, { rekening }) };
        });
      },
      setRekening(rekening) {
        set(s => ({ rekening, events: syncEvent(s, { rekening }) }));
      },

      addGrade(g) {
        set(s => {
          const grades = [...s.grades, { ...g, id: uid() }];
          return { grades, events: syncEvent(s, { grades }) };
        });
      },
      updateGrade(id, g) {
        set(s => {
          const grades = s.grades.map(x => x.id === id ? { ...x, ...g } : x);
          return { grades, events: syncEvent(s, { grades }) };
        });
      },
      deleteGrade(id) {
        set(s => {
          const grades = s.grades.filter(x => x.id !== id);
          return { grades, events: syncEvent(s, { grades }) };
        });
      },

      addHadiah(h) {
        set(s => {
          const hadiah = [...s.hadiah, { ...h, id: uid() }];
          return { hadiah, events: syncEvent(s, { hadiah }) };
        });
      },
      updateHadiah(id, h) {
        set(s => {
          const hadiah = s.hadiah.map(x => x.id === id ? { ...x, ...h } : x);
          return { hadiah, events: syncEvent(s, { hadiah }) };
        });
      },
      deleteHadiah(id) {
        set(s => {
          const hadiah = s.hadiah.filter(x => x.id !== id);
          return { hadiah, events: syncEvent(s, { hadiah }) };
        });
      },
      setHadiah(hadiah) {
        set(s => ({ hadiah, events: syncEvent(s, { hadiah }) }));
      },

      addWinner(w) {
        set(s => {
          const history = [...s.history, w];
          return { history, events: syncEvent(s, { history }) };
        });
      },
      clearHistory() {
        set(s => ({ history: [], events: syncEvent(s, { history: [] }) }));
      },

      updateSettings(settings) {
        set(s => ({
          ...settings,
          events: settings.period != null
            ? s.events.map(e => e.id === s.activeEventId ? { ...e, period: settings.period! } : e)
            : s.events,
        }));
      },

      resetAll() {
        setAuthInSession(false);
        set(s => {
          const cleared = { rekening: [], grades: [], hadiah: [], history: [] as Winner[] };
          return {
            ...cleared,
            isAuthenticated: false,
            events: s.events.map(e =>
              e.id === s.activeEventId ? { ...e, ...cleared } : e
            ),
          };
        });
      },

      importState(data) {
        const d = data as Partial<AppState>;
        if (d.events?.length) {
          const active = d.events.find(e => e.id === d.activeEventId) ?? d.events[0];
          set(s => ({
            ...s,
            ...(d.password ? { password: d.password } : {}),
            ...(d.audio != null ? { audio: d.audio } : {}),
            events: d.events!,
            activeEventId: active?.id ?? s.activeEventId,
            period: active?.period ?? s.period,
            rekening: active?.rekening ?? [],
            grades: active?.grades ?? [],
            hadiah: active?.hadiah ?? [],
            history: active?.history ?? [],
          }));
        } else {
          // Old-format backup: import as current active event
          set(s => {
            const merged: UndianEvent = {
              ...s.events.find(e => e.id === s.activeEventId)!,
              ...(d.period ? { period: d.period } : {}),
              ...(d.rekening ? { rekening: d.rekening } : {}),
              ...(d.grades ? { grades: d.grades } : {}),
              ...(d.hadiah ? { hadiah: d.hadiah } : {}),
              ...(d.history ? { history: d.history } : {}),
            };
            return {
              ...s,
              ...(d.period ? { period: d.period } : {}),
              ...(d.rekening ? { rekening: d.rekening } : {}),
              ...(d.grades ? { grades: d.grades } : {}),
              ...(d.hadiah ? { hadiah: d.hadiah } : {}),
              ...(d.history ? { history: d.history } : {}),
              events: s.events.map(e => e.id === s.activeEventId ? merged : e),
            };
          });
        }
      },

      addEvent(name, period) {
        const newEvent: UndianEvent = {
          id: uid(), name, period,
          rekening: [], grades: [], hadiah: [], history: [],
        };
        set(s => ({ events: [...s.events, newEvent] }));
      },

      switchEvent(id) {
        set(s => {
          const e = s.events.find(x => x.id === id);
          if (!e) return s;
          return {
            activeEventId: id,
            period: e.period,
            rekening: e.rekening,
            grades: e.grades,
            hadiah: e.hadiah,
            history: e.history,
          };
        });
      },

      updateEventMeta(id, meta) {
        set(s => ({
          events: s.events.map(e => e.id === id ? { ...e, ...meta } : e),
          ...(s.activeEventId === id && meta.period ? { period: meta.period } : {}),
        }));
      },

      deleteEvent(id) {
        set(s => {
          if (s.events.length <= 1) return s;
          const events = s.events.filter(e => e.id !== id);
          if (s.activeEventId !== id) return { events };
          const next = events[0];
          return {
            events,
            activeEventId: next.id,
            period: next.period,
            rekening: next.rekening,
            grades: next.grades,
            hadiah: next.hadiah,
            history: next.history,
          };
        });
      },
    }),
    {
      name: 'perdana-undian-v4',
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Migration: old format has no events array
        if (!state.events || state.events.length === 0) {
          const id = uid();
          state.events = [{
            id,
            name: 'Tabungan Perdana Plus',
            period: state.period || 'Tahun 2026',
            rekening: state.rekening || [],
            grades: state.grades || [],
            hadiah: state.hadiah || [],
            history: state.history || [],
          }];
          state.activeEventId = id;
        }
        // Ensure activeEventId points to an existing event
        if (!state.events.find(e => e.id === state.activeEventId)) {
          state.activeEventId = state.events[0].id;
        }
        // Sync flat state from active event
        const active = state.events.find(e => e.id === state.activeEventId)!;
        state.period = active.period;
        state.rekening = active.rekening;
        state.grades = active.grades;
        state.hadiah = active.hadiah;
        state.history = active.history;
      },
      partialize: (s) => ({
        password: s.password,
        audio: s.audio,
        activeEventId: s.activeEventId,
        events: s.events,
        // Keep flat arrays so old-format data survives migration
        period: s.period,
        rekening: s.rekening,
        grades: s.grades,
        hadiah: s.hadiah,
        history: s.history,
      }),
    }
  )
);
