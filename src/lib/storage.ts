import { createInitialState, isAppState, isPristineExampleState, STORAGE_KEY } from './lists';
import type { AppState } from './types';

export type StoredState = {
  state: AppState;
  corrupt: boolean;
  unavailable: boolean;
};

export function loadStoredState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { state: createInitialState(), corrupt: false, unavailable: false };
    const parsed: unknown = JSON.parse(raw);
    if (!isAppState(parsed)) return { state: createInitialState(), corrupt: true, unavailable: false };
    return {
      state: isPristineExampleState(parsed) ? createInitialState() : parsed,
      corrupt: false,
      unavailable: false,
    };
  } catch (error) {
    if (error instanceof SyntaxError) return { state: createInitialState(), corrupt: true, unavailable: false };
    return { state: createInitialState(), corrupt: false, unavailable: true };
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function resetStoredState(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
