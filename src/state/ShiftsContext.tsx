import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { ShiftAction, ShiftsState } from '../types';
import { seedState } from '../data/seed';
import { shiftsReducer } from './shiftsReducer';

interface ShiftsContextValue {
  state: ShiftsState;
  dispatch: Dispatch<ShiftAction>;
  /**
   * Run the reducer against the latest committed state and only dispatch if it
   * produces a new state. Returns true when the action was applied, false when
   * a reducer guard rejected it (stale click, already-claimed shift, etc.).
   * Callers use the return value to decide whether to show success feedback.
   */
  tryDispatch: (action: ShiftAction) => boolean;
}

const ShiftsContext = createContext<ShiftsContextValue | null>(null);

export function ShiftsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shiftsReducer, seedState);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const tryDispatch = useCallback((action: ShiftAction): boolean => {
    const before = stateRef.current;
    const after = shiftsReducer(before, action);
    if (after === before) return false;
    // Keep the ref in sync within the same tick so rapid double-clicks see the
    // updated state before React has committed and re-rendered.
    stateRef.current = after;
    dispatch(action);
    return true;
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, tryDispatch }),
    [state, tryDispatch],
  );
  return (
    <ShiftsContext.Provider value={value}>{children}</ShiftsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useShifts(): ShiftsContextValue {
  const ctx = useContext(ShiftsContext);
  if (!ctx) throw new Error('useShifts must be used within ShiftsProvider');
  return ctx;
}
