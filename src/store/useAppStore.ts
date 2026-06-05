import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Rekening, Grade, Hadiah, Winner, AppState } from '../types';
import { uid } from '../utils/helpers';

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
}

const defaultState: AppState = {
  period: 'Tahun 2026',
  password: 'perdana2026',
  audio: true,
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

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      isAuthenticated: getAuthFromSession(),

      login(password: string) {
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
        set(s => ({ rekening: [...s.rekening, { ...r, id: uid() }] }));
      },
      updateRekening(id, r) {
        set(s => ({ rekening: s.rekening.map(x => x.id === id ? { ...x, ...r } : x) }));
      },
      deleteRekening(id) {
        set(s => ({ rekening: s.rekening.filter(x => x.id !== id) }));
      },
      setRekening(reks) {
        set({ rekening: reks });
      },

      addGrade(g) {
        set(s => ({ grades: [...s.grades, { ...g, id: uid() }] }));
      },
      updateGrade(id, g) {
        set(s => ({ grades: s.grades.map(x => x.id === id ? { ...x, ...g } : x) }));
      },
      deleteGrade(id) {
        set(s => ({ grades: s.grades.filter(x => x.id !== id) }));
      },

      addHadiah(h) {
        set(s => ({ hadiah: [...s.hadiah, { ...h, id: uid() }] }));
      },
      updateHadiah(id, h) {
        set(s => ({ hadiah: s.hadiah.map(x => x.id === id ? { ...x, ...h } : x) }));
      },
      deleteHadiah(id) {
        set(s => ({ hadiah: s.hadiah.filter(x => x.id !== id) }));
      },
      setHadiah(hadiah) {
        set({ hadiah });
      },

      addWinner(w) {
        set(s => ({ history: [...s.history, w] }));
      },
      clearHistory() {
        set({ history: [] });
      },

      updateSettings(s) {
        set(s);
      },

      resetAll() {
        setAuthInSession(false);
        set({ ...defaultState, isAuthenticated: false });
      },

      importState(s) {
        set(prev => ({ ...prev, ...s }));
      },
    }),
    {
      name: 'perdana-undian-v4',
      partialize: (state) => ({
        period: state.period,
        password: state.password,
        audio: state.audio,
        rekening: state.rekening,
        grades: state.grades,
        hadiah: state.hadiah,
        history: state.history,
      }),
    }
  )
);
