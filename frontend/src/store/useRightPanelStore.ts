import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const LS_RIGHT_PANEL_KEY = 'safefusion:right-panel-open';

interface RightPanelState {
  open: boolean;
  clearedAt: number;
  toggle: () => void;
  setOpen: (value: boolean) => void;
  setClearedAt: (value: number) => void;
}

export const useRightPanelStore = create<RightPanelState>()(
  persist(
    (set) => ({
      open: true,
      clearedAt: 0,
      toggle: () => set((s) => ({ open: !s.open })),
      setOpen: (value) => set({ open: value }),
      setClearedAt: (value) => set({ clearedAt: value }),
    }),
    { name: LS_RIGHT_PANEL_KEY },
  ),
);
