import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { ShiftAction, ShiftsState } from '../types';
import { seedState } from '../data/seed';
import { shiftsReducer } from './shiftsReducer';

interface ShiftsContextValue {
  state: ShiftsState;
  dispatch: Dispatch<ShiftAction>;
}

const ShiftsContext = createContext<ShiftsContextValue | null>(null);

export function ShiftsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shiftsReducer, seedState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <ShiftsContext.Provider value={value}>{children}</ShiftsContext.Provider>
  );
}

export function useShifts(): ShiftsContextValue {
  const ctx = useContext(ShiftsContext);
  if (!ctx) throw new Error('useShifts must be used within ShiftsProvider');
  return ctx;
}
